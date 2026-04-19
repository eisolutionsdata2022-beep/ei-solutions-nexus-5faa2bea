import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Database, Loader2, Trash2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  LEGACY_COLLECTIONS,
  countLegacyDocs,
  purgeLegacyCollections,
  type CleanupResult,
  type LegacyCollection,
} from "@/lib/legacy-cleanup";

export function LegacyCleanupCard() {
  const [counts, setCounts] = useState<CleanupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [purging, setPurging] = useState(false);
  const [progress, setProgress] = useState<Record<string, { d: number; t: number }>>({});

  const loadCounts = async () => {
    setLoading(true);
    try {
      setCounts(await countLegacyDocs());
    } catch (e: any) {
      toast.error(e?.message || "Failed to count legacy docs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCounts(); }, []);

  const total = counts ? Object.values(counts).reduce((s, n) => s + n, 0) : 0;

  const handlePurge = async () => {
    setPurging(true);
    setProgress({});
    try {
      const res = await purgeLegacyCollections((col, d, t) => {
        setProgress((p) => ({ ...p, [col]: { d, t } }));
      });
      const sum = Object.values(res).reduce((s, n) => s + n, 0);
      toast.success(`Permanently deleted ${sum} legacy records.`);
      setConfirmOpen(false);
      setConfirmText("");
      await loadCounts();
    } catch (e: any) {
      toast.error(e?.message || "Cleanup failed");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden border-2 border-rose-500/30">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border/40 bg-gradient-to-r from-rose-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Legacy Data Cleanup
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">One-time</span>
            </h2>
            <p className="text-xs text-muted-foreground">Permanently delete old E-dis & DMT v1 records.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={loadCounts} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LEGACY_COLLECTIONS.map((c) => (
            <div key={c} className="rounded-xl bg-muted/40 p-3 border border-border/40">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">{c}</p>
              <p className="text-2xl font-bold tabular-nums">
                {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : (counts?.[c] ?? 0)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p>
            This permanently deletes all records from <code className="font-mono">serviceApplications</code>,{" "}
            <code className="font-mono">dmtTransfers</code>, <code className="font-mono">dmtCustomers</code>, and{" "}
            <code className="font-mono">dmtBeneficiaries</code>. The new v2 collections used by the rebuilt
            E-dis and Money Transfer pages are NOT affected. This action is irreversible.
          </p>
        </div>

        <Button
          variant="destructive"
          className="w-full"
          disabled={loading || total === 0}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {total === 0 ? "No legacy records to delete" : `Delete ${total} legacy records permanently`}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !purging && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Confirm permanent deletion
            </DialogTitle>
            <DialogDescription>
              You are about to permanently delete <strong>{total}</strong> legacy records across {LEGACY_COLLECTIONS.length} collections. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              {(Object.keys(counts ?? {}) as LegacyCollection[]).map((c) => (
                <div key={c} className="flex justify-between">
                  <span className="font-mono">{c}</span>
                  <span className="font-bold">
                    {progress[c] ? `${progress[c].d} / ${progress[c].t}` : counts?.[c] ?? 0}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <Label className="text-xs">Type <code className="font-mono font-bold">DELETE</code> to confirm</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={purging}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={purging}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={purging || confirmText !== "DELETE"}
            >
              {purging ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Purging…</> : <><Trash2 className="w-4 h-4 mr-2" /> Permanently delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
