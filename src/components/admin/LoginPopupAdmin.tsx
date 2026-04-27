import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  subscribeLoginPopupConfig,
  saveLoginPopupConfig,
  DEFAULT_LOGIN_POPUP,
  type LoginPopupConfig,
  type LoginPopupAudience,
} from "@/lib/login-popup-config";
import { Megaphone, Save, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export function LoginPopupAdmin() {
  const { appUser } = useAuth();
  const [cfg, setCfg] = useState<LoginPopupConfig>({ ...DEFAULT_LOGIN_POPUP });
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState(DEFAULT_LOGIN_POPUP.title);
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<LoginPopupAudience>("all");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [forceReshow, setForceReshow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [retailers, setRetailers] = useState<
    Array<{ uid: string; name?: string; email: string; phone?: string }>
  >([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribeLoginPopupConfig((c) => {
      setCfg(c);
      setEnabled(c.enabled);
      setTitle(c.title || DEFAULT_LOGIN_POPUP.title);
      setMessage(c.message || "");
      setAudience(c.audience);
      setSelectedUids(c.selectedUids || []);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "retailer"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Array<{ uid: string; name?: string; email: string; phone?: string }> = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        list.push({ uid: d.id, name: data.name, email: data.email, phone: data.phone });
      });
      list.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
      setRetailers(list);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return retailers;
    return retailers.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(t) ||
        r.email.toLowerCase().includes(t) ||
        (r.phone || "").toLowerCase().includes(t),
    );
  }, [retailers, search]);

  const toggleUid = (uid: string, checked: boolean) => {
    setSelectedUids((prev) => {
      if (checked) return prev.includes(uid) ? prev : [...prev, uid];
      return prev.filter((u) => u !== uid);
    });
  };

  const selectAllFiltered = () => {
    setSelectedUids((prev) => {
      const set = new Set(prev);
      filtered.forEach((r) => set.add(r.uid));
      return Array.from(set);
    });
  };

  const clearAllFiltered = () => {
    const removeSet = new Set(filtered.map((r) => r.uid));
    setSelectedUids((prev) => prev.filter((u) => !removeSet.has(u)));
  };

  const save = async () => {
    if (enabled && !message.trim()) {
      toast.error("Message cannot be empty when popup is enabled.");
      return;
    }
    if (enabled && audience === "selected" && selectedUids.length === 0) {
      toast.error("Pick at least one retailer or switch audience to All.");
      return;
    }
    setSaving(true);
    try {
      await saveLoginPopupConfig(
        {
          enabled,
          title: title.trim() || "Announcement",
          message: message.trim(),
          audience,
          selectedUids,
          bumpVersion: forceReshow,
        },
        appUser?.uid,
      );
      toast.success(
        forceReshow
          ? "Saved. Popup will re-show for all targeted retailers."
          : "Saved.",
      );
      setForceReshow(false);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-gov-blue" />
            Retailer Login Popup
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="popup-enabled" className="text-xs font-bold">
              {enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch id="popup-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Show a custom message to retailers right after they log in. Edit anytime.
          </p>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Popup Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement"
              className="h-9 text-sm"
              maxLength={80}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type the message that retailers will see right after login…"
              rows={5}
              className="text-sm"
              maxLength={2000}
            />
            <p className="text-[11px] text-muted-foreground">
              {message.length}/2000 characters · Plain text · Line breaks preserved.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Audience</Label>
            <RadioGroup
              value={audience}
              onValueChange={(v) => setAudience(v as LoginPopupAudience)}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="aud-all" />
                <Label htmlFor="aud-all" className="text-sm font-medium cursor-pointer">
                  All retailers
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="selected" id="aud-sel" />
                <Label htmlFor="aud-sel" className="text-sm font-medium cursor-pointer">
                  Selected retailers only
                </Label>
              </div>
            </RadioGroup>
          </div>

          {audience === "selected" && (
            <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold">Pick retailers</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedUids.length} selected
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-7 w-48 text-xs"
                  />
                  <Button
                    type="button" size="sm" variant="outline" className="h-7 text-xs"
                    onClick={selectAllFiltered}
                  >
                    Select shown
                  </Button>
                  <Button
                    type="button" size="sm" variant="outline" className="h-7 text-xs"
                    onClick={clearAllFiltered}
                  >
                    Clear shown
                  </Button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border rounded-lg bg-background">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/70 backdrop-blur">
                    <tr className="border-b">
                      <th className="text-left px-3 py-2 text-[11px] font-bold w-10"></th>
                      <th className="text-left px-3 py-2 text-[11px] font-bold">Retailer</th>
                      <th className="text-left px-3 py-2 text-[11px] font-bold">Email / Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-xs text-muted-foreground py-6">
                          No retailers found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((r) => {
                        const checked = selectedUids.includes(r.uid);
                        return (
                          <tr key={r.uid} className="border-b hover:bg-muted/40">
                            <td className="px-3 py-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => toggleUid(r.uid, Boolean(v))}
                              />
                            </td>
                            <td className="px-3 py-2 text-xs font-medium">{r.name || "—"}</td>
                            <td className="px-3 py-2 text-[11px] text-muted-foreground">
                              <div>{r.email}</div>
                              {r.phone && <div>{r.phone}</div>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border">
            <Checkbox
              id="force-reshow"
              checked={forceReshow}
              onCheckedChange={(v) => setForceReshow(Boolean(v))}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="force-reshow" className="text-xs font-bold cursor-pointer flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Re-show to retailers who already dismissed it
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Tick this when you've updated the message and want everyone to see the new version again.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
            <Button
              variant="outline" size="sm" className="h-9 text-xs"
              onClick={() => setPreviewOpen(true)}
              disabled={!message.trim()}
            >
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </Button>
            <div className="flex items-center gap-2">
              {cfg.updatedAt && (
                <span className="text-[11px] text-muted-foreground">
                  Last updated: {new Date(cfg.updatedAt).toLocaleString()}
                </span>
              )}
              <Button onClick={save} disabled={saving} className="h-9 text-xs">
                <Save className="w-3 h-3 mr-1" />
                {saving ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gov-blue">
              <Megaphone className="w-5 h-5" />
              {title || "Announcement"}
            </DialogTitle>
            <DialogDescription className="sr-only">Preview</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed py-2">
            {message || "(empty message)"}
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)} className="bg-gov-blue text-white font-bold">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
