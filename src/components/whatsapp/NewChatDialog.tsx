import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, MessageCircle, Phone, UserCircle, Upload, ContactRound } from "lucide-react";
import { toast } from "sonner";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/lib/crm-types";
import type { UploadedLead } from "@/lib/bulk-comm-types";

interface ContactOption {
  id: string;
  name: string;
  phone: string;
  source: "crm" | "uploaded";
  meta?: string;
}

interface Props {
  scope: "admin" | "staff";
  staffId?: string;
  onPick: (phone: string, name: string) => void;
}

const PHONE_RE = /^[6-9]\d{9}$/;

function normalize(p: string): string {
  const digits = (p || "").replace(/\D+/g, "");
  // Strip country code if 12 digits starting with 91
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits.slice(-10);
}

export function NewChatDialog({ scope, staffId, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [crmLeads, setCrmLeads] = useState<ContactOption[]>([]);
  const [uploaded, setUploaded] = useState<ContactOption[]>([]);
  const [manualPhone, setManualPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // CRM leads — staff sees only assigned, admin sees all
        const crmQ = scope === "staff" && staffId
          ? query(collection(db, "crmLeads"), where("assignedStaffId", "==", staffId), limit(500))
          : query(collection(db, "crmLeads"), orderBy("createdAt", "desc"), limit(500));
        const crmSnap = await getDocs(crmQ);
        const crmRows: ContactOption[] = crmSnap.docs
          .map((d) => {
            const l = { id: d.id, ...d.data() } as Lead;
            const phone = normalize(l.phone);
            return {
              id: `crm-${l.id}`,
              name: l.name || "Unknown",
              phone,
              source: "crm" as const,
              meta: l.courseInterested || l.location || l.leadSource,
            };
          })
          .filter((c) => PHONE_RE.test(c.phone));

        // Uploaded leads — same source for both scopes (no per-staff assignment in v1)
        const upQ = query(collection(db, "uploadedLeads"), orderBy("uploadedAt", "desc"), limit(500));
        const upSnap = await getDocs(upQ);
        const upRows: ContactOption[] = upSnap.docs
          .map((d) => {
            const l = { id: d.id, ...d.data() } as UploadedLead;
            const phone = normalize(l.phone);
            return {
              id: `up-${l.id}`,
              name: l.name || "Unknown",
              phone,
              source: "uploaded" as const,
              meta: l.tag,
            };
          })
          .filter((c) => PHONE_RE.test(c.phone));

        if (!cancelled) {
          setCrmLeads(crmRows);
          setUploaded(upRows);
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load contacts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, scope, staffId]);

  const filterRows = (rows: ContactOption[]) => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(s) || r.phone.includes(s) || (r.meta || "").toLowerCase().includes(s)
    );
  };

  const filteredCrm = useMemo(() => filterRows(crmLeads), [crmLeads, search]);
  const filteredUploaded = useMemo(() => filterRows(uploaded), [uploaded, search]);

  const pick = (c: ContactOption) => {
    onPick(c.phone, c.name);
    setOpen(false);
    setSearch("");
  };

  const startManual = () => {
    const p = normalize(manualPhone);
    if (!PHONE_RE.test(p)) {
      toast.error("Enter a valid 10-digit Indian mobile (starts with 6-9)");
      return;
    }
    onPick(p, p);
    setOpen(false);
    setManualPhone("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <MessageCircle className="h-4 w-4" />
          New chat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Start a new WhatsApp chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, or tag…"
              className="pl-8"
            />
          </div>

          <Tabs defaultValue="crm">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="crm" className="gap-1.5 text-xs">
                <ContactRound className="h-3.5 w-3.5" />
                CRM Leads <Badge variant="outline" className="text-[10px] ml-1">{filteredCrm.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="uploaded" className="gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                Uploaded <Badge variant="outline" className="text-[10px] ml-1">{filteredUploaded.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5 text-xs">
                <Phone className="h-3.5 w-3.5" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="crm">
              <ContactList
                rows={filteredCrm}
                loading={loading}
                emptyText={scope === "staff"
                  ? "No CRM leads assigned to you (with valid mobile)."
                  : "No CRM leads found."}
                onPick={pick}
              />
            </TabsContent>

            <TabsContent value="uploaded">
              <ContactList
                rows={filteredUploaded}
                loading={loading}
                emptyText="No uploaded leads with valid mobile numbers."
                onPick={pick}
              />
            </TabsContent>

            <TabsContent value="manual" className="space-y-3 pt-2">
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter a 10-digit Indian mobile number to start a chat (no save).
                </p>
                <div className="flex gap-2">
                  <Input
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="9876543210"
                    onKeyDown={(e) => { if (e.key === "Enter") startManual(); }}
                  />
                  <Button onClick={startManual} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Start
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContactList({
  rows, loading, emptyText, onPick,
}: {
  rows: ContactOption[];
  loading: boolean;
  emptyText: string;
  onPick: (c: ContactOption) => void;
}) {
  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="max-h-80 overflow-y-auto border border-border rounded-md divide-y divide-border">
      {rows.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c)}
          className="w-full text-left p-2.5 hover:bg-muted/60 transition flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0 text-xs font-semibold">
            {c.name.charAt(0).toUpperCase() || <UserCircle className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{c.name}</p>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {c.source === "crm" ? "CRM" : "Upload"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              +91 {c.phone}{c.meta ? ` · ${c.meta}` : ""}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
