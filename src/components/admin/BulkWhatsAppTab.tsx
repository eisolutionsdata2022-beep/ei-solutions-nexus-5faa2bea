import { useMemo, useState } from "react";
import { Send, Loader2, AlertTriangle, MessageCircle, Users, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { resolveAudience } from "@/lib/bulk-comm-firebase";
import { createWaCampaign } from "@/lib/whatsapp-firebase";
import { dispatchWhatsAppCampaign, sendWhatsAppMessage } from "@/lib/whatsapp-bridge.functions";
import type { AudienceFilter, ContactSource, UnifiedContact } from "@/lib/bulk-comm-types";

const SOURCE_LABELS: Record<ContactSource, string> = {
  retailer: "Retailers",
  enquiry: "Landing Enquiries",
  crmLead: "CRM Leads",
  uploaded: "Uploaded Leads",
};

const HARD_CAP_PER_DISPATCH = 100;

interface Props {
  appUserUid: string;
}

export function BulkWhatsAppTab({ appUserUid }: Props) {
  const [filter, setFilter] = useState<AudienceFilter>({
    sources: ["retailer", "crmLead"],
    retailerStatus: "all",
    enquiryStatus: "all",
    excludeOptedOut: true,
  });
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [loadingAud, setLoadingAud] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [body, setBody] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const validRecipients = useMemo(
    () => contacts.filter((c) => /^[6-9]\d{9}$/.test((c.phone || "").replace(/\D+/g, "").slice(-10))),
    [contacts]
  );

  const willSend = validRecipients.slice(0, HARD_CAP_PER_DISPATCH);
  const skipped = contacts.length - validRecipients.length;
  const overflow = Math.max(0, validRecipients.length - HARD_CAP_PER_DISPATCH);

  const loadAudience = async () => {
    setLoadingAud(true);
    try {
      const rows = await resolveAudience(filter);
      setContacts(rows);
      toast.success(`Loaded ${rows.length} contacts`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load audience");
    } finally { setLoadingAud(false); }
  };

  const toggleSource = (src: ContactSource) => {
    setFilter((f) => ({
      ...f,
      sources: f.sources.includes(src) ? f.sources.filter((s) => s !== src) : [...f.sources, src],
    }));
  };

  const personalize = (tpl: string, name: string) => {
    const safe = (name || "there").trim();
    return tpl.replace(/\{\{\s*name\s*\}\}/gi, safe);
  };

  const sendTest = async () => {
    if (!testPhone || !body.trim()) {
      toast.error("Test phone + message body required");
      return;
    }
    setSendingTest(true);
    try {
      const res = await sendWhatsAppMessage({
        data: { phone: testPhone, body: `🧪 [TEST]\n${personalize(body, "Test User")}` },
      });
      if ((res as any).ok) toast.success("Test sent ✓");
      else toast.error((res as any).error || "Test failed");
    } catch (e: any) {
      toast.error(e?.message || "Test failed");
    } finally { setSendingTest(false); }
  };

  const dispatch = async () => {
    if (!campaignName.trim() || !body.trim()) {
      toast.error("Campaign name + message body required"); return;
    }
    if (willSend.length === 0) {
      toast.error("No valid recipients (need 10-digit Indian mobile starting 6-9)"); return;
    }
    const confirmMsg =
      `Send to ${willSend.length} recipients?\n\n` +
      `⚠️ This sends from your unofficial WhatsApp Web bridge.\n` +
      `Daily cap: 100 msgs. Rate: ~5/min with 8-18s human-like delay.\n` +
      `Estimated time: ~${Math.ceil(willSend.length * 13 / 60)} min.\n\n` +
      `Continue?`;
    if (!confirm(confirmMsg)) return;

    setDispatching(true);
    try {
      const campaignId = doc(collection(db, "whatsappCampaigns")).id;
      await createWaCampaign({
        campaignId,
        name: campaignName.trim(),
        body: body.trim(),
        total: willSend.length,
        createdBy: appUserUid,
      });

      const messages = willSend.map((c, i) => ({
        phone: c.phone,
        body: personalize(body, c.name),
        name: c.name,
        recipientId: `${c.id}-${i}`,
      }));

      const res = await dispatchWhatsAppCampaign({ data: { campaignId, messages } });
      if ((res as any).ok) {
        toast.success(`Queued ${(res as any).accepted} messages — running in background`);
        setCampaignName("");
        setBody("");
      } else {
        toast.error((res as any).error || "Dispatch failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Dispatch failed");
    } finally { setDispatching(false); }
  };

  return (
    <div className="space-y-4">
      {/* Risk banner */}
      <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="p-3 flex gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">⚠️ WhatsApp bulk via unofficial bridge</p>
            <p className="text-amber-800/90 dark:text-amber-300/80">
              Hard caps enforced on the VPS: <b>5 msgs/min, 100/day</b>. Bridge uses random 8-18 s human-like delays.
              Sending bulk to non-contacts dramatically increases ban risk on your business number.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audience picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> Audience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            {(Object.keys(SOURCE_LABELS) as ContactSource[]).map((src) => (
              <label key={src} className="flex items-center gap-2 p-2 border border-border rounded-md cursor-pointer hover:bg-muted/50 text-xs">
                <Checkbox checked={filter.sources.includes(src)} onCheckedChange={() => toggleSource(src)} />
                <span className="font-medium">{SOURCE_LABELS[src]}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={filter.excludeOptedOut} onCheckedChange={(v) => setFilter((f) => ({ ...f, excludeOptedOut: v }))} />
            <Label className="text-xs cursor-pointer">Exclude opted-out emails (still loads them; skipped on send if no valid phone)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={loadAudience} disabled={loadingAud}>
              {loadingAud ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Load audience
            </Button>
            <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{contacts.length} loaded</Badge>
            <Badge className="bg-emerald-600">{validRecipients.length} valid mobile</Badge>
            {skipped > 0 && <Badge variant="secondary">{skipped} skipped (no/invalid phone)</Badge>}
            {overflow > 0 && <Badge variant="destructive">{overflow} truncated (daily cap 100)</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-600" /> Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Campaign name (internal)</Label>
            <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. PAN promo Apr 2026" />
          </div>
          <div>
            <Label className="text-xs">Message body — supports {"{{name}}"} token</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder={"Hi {{name}},\n\nജൂൺ 30 വരെ PAN application ₹50 discount available 🎉\nവിശദാംശങ്ങൾക്ക്: https://eisoluions.xyz\n\n- EI Solutions"}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{body.length} chars · WhatsApp limit: 4096</p>
          </div>

          {/* Test send */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Test send to (phone, 10-digit or with country code)</Label>
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="9876543210" />
            </div>
            <Button variant="outline" size="sm" onClick={sendTest} disabled={sendingTest}>
              {sendingTest ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Send test
            </Button>
          </div>

          {/* Dispatch */}
          <div className="border-t pt-3">
            <Button
              onClick={dispatch}
              disabled={dispatching || willSend.length === 0 || !campaignName.trim() || !body.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {dispatching ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              Dispatch to {willSend.length} recipients
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2">
              Sending happens on the VPS bridge, not in your browser. You can close this tab — progress is mirrored to Firestore and visible in the WhatsApp Inbox.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
