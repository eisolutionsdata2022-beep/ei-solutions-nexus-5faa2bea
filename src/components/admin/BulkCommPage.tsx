import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Users, Mail, Send, Upload, BarChart3, Download, Search, Loader2,
  CheckCircle2, XCircle, Eye, Trash2, Sparkles, FileSpreadsheet, AlertTriangle, RefreshCw, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  subscribeLandingEnquiries, subscribeUploadedLeads, subscribeCampaigns,
  subscribeCampaignRecipients, bulkInsertUploadedLeads, deleteUploadedLead,
  resolveAudience, createCampaign, updateCampaign,
} from "@/lib/bulk-comm-firebase";
import {
  doc, writeBatch, collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendBulkEmailBatch, sendTestEmail } from "@/lib/bulk-email.functions";
import { RichEmailEditor } from "@/components/admin/RichEmailEditor";
import type {
  LandingEnquiry, UploadedLead, BulkEmailCampaign, AudienceFilter,
  ContactSource, UnifiedContact, BulkEmailRecipient,
} from "@/lib/bulk-comm-types";
import { useAuth } from "@/lib/auth-context";

const SOURCE_LABELS: Record<ContactSource, string> = {
  retailer: "Retailers",
  enquiry: "Landing Enquiries",
  crmLead: "CRM Leads",
  uploaded: "Uploaded Leads",
};

export function BulkCommPage() {
  const { appUser } = useAuth();
  const [tab, setTab] = useState("contacts");

  // Live subscriptions
  const [enquiries, setEnquiries] = useState<LandingEnquiry[]>([]);
  const [uploaded, setUploaded] = useState<UploadedLead[]>([]);
  const [campaigns, setCampaigns] = useState<BulkEmailCampaign[]>([]);

  useEffect(() => subscribeLandingEnquiries(setEnquiries), []);
  useEffect(() => subscribeUploadedLeads(setUploaded), []);
  useEffect(() => subscribeCampaigns(setCampaigns), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Bulk Communication
          </h1>
          <p className="text-sm text-muted-foreground">
            Send personalized email campaigns to retailers, leads & enquiries
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KPI icon={Users} label="Landing Enquiries" value={enquiries.length} color="text-blue-600" />
        <KPI icon={FileSpreadsheet} label="Uploaded Leads" value={uploaded.length} color="text-violet-600" />
        <KPI icon={Mail} label="Total Campaigns" value={campaigns.length} color="text-amber-600" />
        <KPI icon={CheckCircle2} label="Emails Sent (all-time)" value={campaigns.reduce((s, c) => s + (c.sentCount || 0), 0)} color="text-emerald-600" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="contacts"><Users className="h-4 w-4 mr-1.5" />Contacts</TabsTrigger>
          <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1.5" />Upload Leads</TabsTrigger>
          <TabsTrigger value="enquiries"><Mail className="h-4 w-4 mr-1.5" />Enquiries</TabsTrigger>
          <TabsTrigger value="compose"><Send className="h-4 w-4 mr-1.5" />Compose Email</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1.5" />Campaign Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts"><ContactsTab /></TabsContent>
        <TabsContent value="upload"><UploadTab uploaded={uploaded} appUserUid={appUser?.uid || ""} /></TabsContent>
        <TabsContent value="enquiries"><EnquiriesTab rows={enquiries} /></TabsContent>
        <TabsContent value="compose"><ComposeTab onSent={() => setTab("reports")} appUserUid={appUser?.uid || ""} /></TabsContent>
        <TabsContent value="reports"><ReportsTab campaigns={campaigns} /></TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <Icon className={`h-7 w-7 ${color}`} />
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value.toLocaleString()}</p></div>
    </CardContent></Card>
  );
}

// ─── CONTACTS TAB ────────────────────────────────────────────────────
function ContactsTab() {
  const [filter, setFilter] = useState<AudienceFilter>({
    sources: ["retailer", "enquiry", "crmLead", "uploaded"],
    retailerStatus: "all",
    enquiryStatus: "all",
    excludeOptedOut: true,
  });
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const result = await resolveAudience(filter);
      setContacts(result);
    } catch (err) { console.error(err); toast.error("Failed to load contacts"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggleSource = (src: ContactSource) => {
    setFilter((f) => ({
      ...f,
      sources: f.sources.includes(src) ? f.sources.filter((s) => s !== src) : [...f.sources, src],
    }));
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.phone.includes(s)
    );
  }, [contacts, search]);

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((c) => ({
      Source: SOURCE_LABELS[c.source], Name: c.name, Email: c.email, Phone: c.phone,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, `contacts_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filter audience</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {(Object.keys(SOURCE_LABELS) as ContactSource[]).map((src) => (
            <label key={src} className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
              <Checkbox checked={filter.sources.includes(src)} onCheckedChange={() => toggleSource(src)} />
              <span className="text-sm font-medium">{SOURCE_LABELS[src]}</span>
            </label>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs">Retailer status</Label>
            <Select value={filter.retailerStatus || "all"} onValueChange={(v) => setFilter((f) => ({ ...f, retailerStatus: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All retailers</SelectItem>
                <SelectItem value="active">Active (logged in 30 days)</SelectItem>
                <SelectItem value="inactive">Inactive (30+ days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Enquiry status</Label>
            <Select value={filter.enquiryStatus || "all"} onValueChange={(v) => setFilter((f) => ({ ...f, enquiryStatus: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Switch id="opt" checked={filter.excludeOptedOut} onCheckedChange={(v) => setFilter((f) => ({ ...f, excludeOptedOut: v }))} />
            <Label htmlFor="opt" className="text-xs cursor-pointer">Exclude opted-out emails</Label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <Button onClick={load} size="sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Apply filters
          </Button>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 h-9 w-56" />
            </div>
            <Button onClick={exportCsv} variant="outline" size="sm" disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Resolved <strong className="text-foreground">{contacts.length}</strong> contact(s){search && ` — showing ${filtered.length}`}
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto border border-border rounded-lg max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="outline" className="text-xs">{SOURCE_LABELS[c.source]}</Badge></TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.email || "—"}</TableCell>
                    <TableCell className="text-xs">{c.phone || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > 500 && (
              <div className="p-2 text-xs text-center text-muted-foreground bg-muted/30">
                Showing first 500 of {filtered.length} — use search to narrow
              </div>
            )}
          </div>
        ) : !loading && (
          <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            No contacts match these filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── UPLOAD TAB ──────────────────────────────────────────────────────
function UploadTab({ uploaded, appUserUid }: { uploaded: UploadedLead[]; appUserUid: string }) {
  const [preview, setPreview] = useState<Array<Omit<UploadedLead, "id" | "uploadedAt">>>([]);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);
        const parsed = rows.map((r) => ({
          name: String(r.Name || r.name || r.NAME || "").trim(),
          email: String(r.Email || r.email || r.EMAIL || "").trim().toLowerCase(),
          phone: String(r.Phone || r.phone || r.PHONE || r.Mobile || r.mobile || "").replace(/\D/g, ""),
          tag: tag || undefined,
          uploadedBy: appUserUid,
          notes: String(r.Notes || r.notes || "").trim() || undefined,
        })).filter((r) => r.email || r.phone);
        setPreview(parsed);
        toast.success(`Parsed ${parsed.length} valid rows`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse file. Use CSV/XLSX with Name, Email, Phone columns.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const importNow = async () => {
    if (!preview.length) return;
    setBusy(true);
    try {
      const taggedPreview = tag ? preview.map((p) => ({ ...p, tag })) : preview;
      const result = await bulkInsertUploadedLeads(taggedPreview);
      toast.success(`✅ Imported ${result.inserted} leads, skipped ${result.duplicates} duplicates`);
      setPreview([]); setTag("");
    } catch (err) { console.error(err); toast.error("Import failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Upload CSV / Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label className="text-xs">File (CSV / XLSX) — columns: Name, Email, Phone, Notes</Label>
              <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>
            <div>
              <Label className="text-xs">Tag (optional)</Label>
              <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Mar-2026-PAN" />
            </div>
          </div>

          {preview.length > 0 && (
            <>
              <div className="text-sm flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Preview: {preview.length} rows ready. Duplicates (by email) will be skipped automatically.
              </div>
              <div className="overflow-x-auto border border-border rounded-lg max-h-72">
                <Table>
                  <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead></TableRow></TableHeader>
                  <TableBody>{preview.slice(0, 50).map((r, i) => (<TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="text-xs">{r.email}</TableCell><TableCell className="text-xs">{r.phone}</TableCell></TableRow>))}</TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button onClick={importNow} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Import {preview.length}</Button>
                <Button variant="outline" onClick={() => setPreview([])} disabled={busy}>Clear</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Existing uploaded leads ({uploaded.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {uploaded.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No leads uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Tag</TableHead><TableHead>Uploaded</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{uploaded.slice(0, 200).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-xs">{l.email}</TableCell>
                    <TableCell className="text-xs">{l.phone}</TableCell>
                    <TableCell>{l.tag && <Badge variant="outline" className="text-xs">{l.tag}</Badge>}</TableCell>
                    <TableCell className="text-xs">{new Date(l.uploadedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteUploadedLead(l.id).then(() => toast.success("Deleted"))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ENQUIRIES TAB ───────────────────────────────────────────────────
function EnquiriesTab({ rows }: { rows: LandingEnquiry[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Landing-page enquiries ({rows.length})</CardTitle></CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No enquiries received yet.</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>When</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Interested in</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-xs">{e.phone}</TableCell>
                  <TableCell className="text-xs">{e.email || "—"}</TableCell>
                  <TableCell className="text-xs">{e.interestedIn || "—"}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{e.message || "—"}</TableCell>
                  <TableCell><Badge variant={e.status === "new" ? "default" : "outline"} className="text-xs">{e.status}</Badge></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── COMPOSE TAB ─────────────────────────────────────────────────────
function ComposeTab({ onSent, appUserUid }: { onSent: () => void; appUserUid: string }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p>Hi {{name}},</p>\n<p>We have a special offer for you…</p>\n<p>Best,<br/>EI Solutions</p>");
  const [filter, setFilter] = useState<AudienceFilter>({
    sources: ["retailer"],
    retailerStatus: "all",
    enquiryStatus: "all",
    excludeOptedOut: true,
  });
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleSource = (src: ContactSource) =>
    setFilter((f) => ({ ...f, sources: f.sources.includes(src) ? f.sources.filter((s) => s !== src) : [...f.sources, src] }));

  const previewAudience = async () => {
    setResolving(true);
    try {
      const list = await resolveAudience(filter);
      const withEmail = list.filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));
      setAudienceCount(withEmail.length);
      toast.success(`${withEmail.length} valid email addresses found`);
    } finally { setResolving(false); }
  };

  const sendTest = async () => {
    if (!testTo || !subject) { toast.error("Enter test email + subject"); return; }
    setSending(true);
    try {
      const res = await sendTestEmail({ data: { to: testTo, subject, htmlBody: body } });
      if (res.ok) toast.success("✅ Test email sent");
      else toast.error(`Failed: ${res.error}`);
    } finally { setSending(false); }
  };

  const sendCampaign = async () => {
    setShowConfirm(false);
    if (!subject.trim() || !body.trim() || !name.trim()) { toast.error("Name, subject and body are required"); return; }
    setSending(true);
    try {
      const list = await resolveAudience(filter);
      const recipients = list.filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email));
      if (!recipients.length) { toast.error("No valid recipients"); return; }

      // Create campaign
      const campRef = await createCampaign({
        name, subject, htmlBody: body, channel: "email", status: "sending",
        audienceFilter: filter, totalRecipients: recipients.length,
        sentCount: 0, deliveredCount: 0, failedCount: 0, openedCount: 0,
        createdBy: appUserUid, startedAt: new Date().toISOString(),
      });
      const campaignId = campRef.id;

      // Pre-create recipient docs
      const recipientDocs: Array<{ recipientDocId: string; email: string; name: string }> = [];
      for (let i = 0; i < recipients.length; i += 400) {
        const batch = writeBatch(db);
        recipients.slice(i, i + 400).forEach((c) => {
          const ref = doc(collection(db, "bulkEmailRecipients"));
          batch.set(ref, {
            campaignId, contactId: c.id, email: c.email, name: c.name,
            status: "pending",
          });
          recipientDocs.push({ recipientDocId: ref.id, email: c.email, name: c.name });
        });
        await batch.commit();
      }

      toast.success(`📤 Sending to ${recipients.length} recipients in background…`);
      onSent(); // Switch to reports tab

      // Send in chunks of 25 — Resend free is 2/sec, so 25 takes ~15s
      let totalSent = 0, totalFailed = 0;
      for (let i = 0; i < recipientDocs.length; i += 25) {
        const chunk = recipientDocs.slice(i, i + 25);
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const result: any = await sendBulkEmailBatch({
          data: { campaignId, subject, htmlBody: body, recipients: chunk, baseUrl },
        });
        if (!result.ok) { toast.error(`Batch failed: ${result.error}`); break; }

        // Update each recipient + tally
        const batch = writeBatch(db);
        result.results.forEach((r: any) => {
          const ref = doc(db, "bulkEmailRecipients", r.recipientDocId);
          if (r.ok) {
            batch.update(ref, { status: "sent", resendId: r.resendId, sentAt: new Date().toISOString() });
            totalSent++;
          } else {
            batch.update(ref, { status: "failed", errorMessage: r.error });
            totalFailed++;
          }
        });
        await batch.commit();
        await updateCampaign(campaignId, { sentCount: totalSent, failedCount: totalFailed });
      }

      await updateCampaign(campaignId, {
        status: totalFailed === recipientDocs.length ? "failed" : "sent",
        completedAt: new Date().toISOString(),
        sentCount: totalSent, failedCount: totalFailed,
      });
      toast.success(`Campaign complete — ${totalSent} sent, ${totalFailed} failed`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Send failed: ${err?.message || err}`);
    } finally { setSending(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Email content</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label className="text-xs">Campaign name (internal)</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PAN Card Promo — March" /></div>
            <div><Label className="text-xs">Subject line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Special offer for you, {{name}}!" /></div>
            <div>
              <Label className="text-xs flex items-center justify-between mb-1">
                <span>Email body</span>
                <span className="text-muted-foreground">Use <code className="bg-muted px-1 rounded">{`{{name}}`}</code> for personalization</span>
              </Label>
              <RichEmailEditor value={body} onChange={setBody} />
              <p className="text-xs text-muted-foreground mt-1">Tip: use the toolbar to add images, CTA buttons & pre-built templates. Unsubscribe footer is added automatically.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" />Test send</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="your@email.com" />
            <Button onClick={sendTest} variant="outline" disabled={sending || !testTo}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="ml-1">Send test</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Audience</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Send to</Label>
            {(Object.keys(SOURCE_LABELS) as ContactSource[]).map((src) => (
              <label key={src} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={filter.sources.includes(src)} onCheckedChange={() => toggleSource(src)} />
                {SOURCE_LABELS[src]}
              </label>
            ))}
          </div>
          <div>
            <Label className="text-xs">Retailer status</Label>
            <Select value={filter.retailerStatus || "all"} onValueChange={(v) => setFilter((f) => ({ ...f, retailerStatus: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active only</SelectItem><SelectItem value="inactive">Inactive only</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={filter.excludeOptedOut} onCheckedChange={(v) => setFilter((f) => ({ ...f, excludeOptedOut: v }))} />
            <Label className="text-xs cursor-pointer">Exclude opted-out</Label>
          </div>

          <Button onClick={previewAudience} variant="outline" className="w-full" disabled={resolving}>
            {resolving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}Preview audience
          </Button>

          {audienceCount !== null && (
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <p className="text-3xl font-bold text-primary">{audienceCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">valid email addresses</p>
            </div>
          )}

          <Button onClick={() => setShowConfirm(true)} disabled={sending || !audienceCount} className="w-full bg-gradient-to-r from-primary to-primary/80">
            <Send className="h-4 w-4 mr-1" />Send campaign
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" />Confirm bulk send</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p>You are about to send "<strong>{subject}</strong>" to <strong>{audienceCount}</strong> recipients.</p>
            <p className="text-muted-foreground">Sending takes ~{Math.ceil((audienceCount || 0) / 100)} minute(s). Don't close this tab until complete.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={sendCampaign}><Send className="h-4 w-4 mr-1" />Confirm send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── REPORTS TAB ─────────────────────────────────────────────────────
function ReportsTab({ campaigns }: { campaigns: BulkEmailCampaign[] }) {
  const [selected, setSelected] = useState<BulkEmailCampaign | null>(null);
  const [recipients, setRecipients] = useState<BulkEmailRecipient[]>([]);

  useEffect(() => {
    if (!selected) return;
    return subscribeCampaignRecipients(selected.id, setRecipients);
  }, [selected]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">All campaigns ({campaigns.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No campaigns yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Subject</TableHead><TableHead>Recipients</TableHead><TableHead>Sent</TableHead><TableHead>Failed</TableHead><TableHead>Opened</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{c.subject}</TableCell>
                    <TableCell>{c.totalRecipients}</TableCell>
                    <TableCell className="text-emerald-600 font-semibold">{c.sentCount}</TableCell>
                    <TableCell className="text-rose-600">{c.failedCount}</TableCell>
                    <TableCell className="text-blue-600 font-semibold">{c.openedCount}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "sent" ? "default" : c.status === "failed" ? "destructive" : "outline"} className="text-xs">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setSelected(c)}><Eye className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{selected.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-muted/30 rounded"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{selected.totalRecipients}</p></div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded"><p className="text-xs text-muted-foreground">Sent</p><p className="text-xl font-bold text-emerald-600">{selected.sentCount}</p></div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded"><p className="text-xs text-muted-foreground">Failed</p><p className="text-xl font-bold text-rose-600">{selected.failedCount}</p></div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded"><p className="text-xs text-muted-foreground">Opened</p><p className="text-xl font-bold text-blue-600">{selected.openedCount}</p></div>
              </div>
              <div className="overflow-x-auto max-h-96 border border-border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Sent at</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
                  <TableBody>{recipients.slice(0, 200).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.email}</TableCell>
                      <TableCell>{r.status === "sent" || r.status === "opened" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : r.status === "failed" ? <XCircle className="h-4 w-4 text-rose-600" /> : <Loader2 className="h-4 w-4 text-amber-500" />}</TableCell>
                      <TableCell className="text-xs">{r.sentAt ? new Date(r.sentAt).toLocaleTimeString() : "—"}</TableCell>
                      <TableCell className="text-xs text-rose-600 max-w-xs truncate">{r.errorMessage || "—"}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
