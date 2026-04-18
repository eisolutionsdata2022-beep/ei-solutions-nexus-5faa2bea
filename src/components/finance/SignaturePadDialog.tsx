/**
 * Signature pad dialog — captures a hand-drawn signature on canvas.
 * Returns a base64 PNG dataURL.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eraser, Check, Pen } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (dataUrl: string) => void;
  title?: string;
}

export function SignaturePadDialog({ open, onOpenChange, onSign, title = "Customer Signature" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0b2354";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    setHasInk(false);
  }, [open]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    const point = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    return {
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top) * scaleY,
    };
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const p = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  }
  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const p = getPos(e);
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
    setHasInk(true);
  }
  function end() {
    drawing.current = false;
  }

  function clear() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
  }
  function confirm() {
    if (!hasInk) return;
    onSign(canvasRef.current!.toDataURL("image/png"));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5" /> {title}
          </DialogTitle>
          <DialogDescription>Sign with your finger or mouse below.</DialogDescription>
        </DialogHeader>
        <div className="border-2 border-dashed border-border rounded-md bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={220}
            className="w-full h-[220px] touch-none cursor-crosshair"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
        </div>
        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button variant="outline" size="sm" onClick={clear}>
            <Eraser className="w-4 h-4 mr-1" /> Clear
          </Button>
          <Button size="sm" onClick={confirm} disabled={!hasInk}>
            <Check className="w-4 h-4 mr-1" /> Save Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
