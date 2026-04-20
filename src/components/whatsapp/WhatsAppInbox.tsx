import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Search, MessageCircle, Loader2, CheckCheck, Check, Clock, AlertCircle,
  UserCheck, Paperclip, X, FileText, Download, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeContacts, subscribeMessages, markContactRead, assignContact,
  listAssignableUsers, subscribeSession,
} from "@/lib/whatsapp-firebase";
import type { WaContact, WaMessage, WaSessionDoc } from "@/lib/whatsapp-types";
import { sendWhatsAppMessage } from "@/lib/whatsapp-bridge.functions";

interface Props {
  /** "admin" sees ALL chats. "staff" sees only chats assigned to them. */
  scope: "admin" | "staff";
}

export function WhatsAppInbox({ scope }: Props) {
  const { appUser } = useAuth();
  const [session, setSession] = useState<WaSessionDoc | null>(null);
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ name: string; mime: string; base64: string; sizeKB: number; previewUrl?: string } | null>(null);

  // Session
  useEffect(() => subscribeSession(setSession), []);

  // Contacts
  useEffect(() => {
    if (!appUser) return;
    return subscribeContacts(setContacts, scope === "staff" ? { assignedTo: appUser.uid } : {});
  }, [appUser, scope]);

  // Messages for active thread
  useEffect(() => {
    if (!activePhone) { setMessages([]); return; }
    return subscribeMessages(activePhone, setMessages);
  }, [activePhone]);

  // Mark read on open
  useEffect(() => {
    if (activePhone) markContactRead(activePhone).catch(() => {});
  }, [activePhone, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activePhone]);

  // Load staff list once (admin only)
  useEffect(() => {
    if (scope === "admin") listAssignableUsers().then(setStaffList).catch(() => {});
  }, [scope]);

  const filteredContacts = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) =>
      c.displayName.toLowerCase().includes(s) || c.phone.includes(s)
    );
  }, [contacts, search]);

  const activeContact = contacts.find((c) => c.phone === activePhone) || null;

  const send = async () => {
    if (!draft.trim() || !activePhone || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const res = await sendWhatsAppMessage({ data: { phone: activePhone, body: text } });
      if (!res.ok) {
        toast.error(res.error || "Send failed");
        setDraft(text);
      }
    } catch (e: any) {
      toast.error(e?.message || "Send failed");
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async (staffId: string) => {
    if (!activePhone) return;
    const staff = staffList.find((s) => s.id === staffId);
    try {
      await assignContact(activePhone, staffId === "__none__" ? null : staffId, staff?.name || null);
      toast.success(staffId === "__none__" ? "Unassigned" : `Assigned to ${staff?.name}`);
    } catch (e: any) {
      toast.error(e?.message || "Assign failed");
    }
  };

  const ready = session?.ready === true;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-3 h-[calc(100vh-180px)] min-h-[480px]">
      {/* ── Contact list ─────────────────────────────────────────────── */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="p-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              Conversations
              <Badge variant="outline" className="text-[10px]">{filteredContacts.length}</Badge>
            </CardTitle>
            <ConnectionDot ready={ready} status={session?.status} />
          </div>
          <div className="relative mt-2">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="pl-7 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {scope === "staff"
                ? "No conversations assigned to you yet."
                : "No conversations yet. Incoming WhatsApp messages will appear here."}
            </div>
          )}
          {filteredContacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setActivePhone(c.phone)}
              className={`w-full text-left p-3 border-b border-border/60 hover:bg-muted/60 transition flex gap-3 items-start ${
                activePhone === c.phone ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0 text-sm font-semibold">
                {(c.displayName || c.phone).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{c.displayName || c.phone}</p>
                  {c.unreadCount && c.unreadCount > 0 ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] h-4 px-1.5">{c.unreadCount}</Badge>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage || c.phone}</p>
                {c.assignedToName && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    <UserCheck className="h-2.5 w-2.5" /> {c.assignedToName}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Chat thread ──────────────────────────────────────────────── */}
      <Card className="flex flex-col overflow-hidden">
        {!activeContact ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Select a conversation to start replying.</p>
              {!ready && (
                <p className="text-xs text-amber-600 mt-3">
                  ⚠️ WhatsApp not connected. Go to Connection tab to scan QR.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-sm font-semibold shrink-0">
                  {(activeContact.displayName || activeContact.phone).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{activeContact.displayName || activeContact.phone}</p>
                  <p className="text-[11px] text-muted-foreground">+{activeContact.phone}</p>
                </div>
              </div>
              {scope === "admin" && (
                <Select value={activeContact.assignedTo || "__none__"} onValueChange={handleAssign}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder="Assign…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} <span className="text-muted-foreground">({s.role})</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.06),transparent_60%)]">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No messages yet.</p>
              )}
              {messages.map((m) => {
                const isOut = m.direction === "out";
                return (
                  <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${
                      isOut ? "bg-emerald-600 text-white" : "bg-card border border-border text-foreground"
                    }`}>
                      {m.body || (m.hasMedia ? "📎 Media message" : "(empty)")}
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isOut ? "text-emerald-50/80" : "text-muted-foreground"}`}>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {isOut && <AckIcon ack={m.ack} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={ready ? "Type a message…" : "WhatsApp not connected — cannot send"}
                disabled={!ready || sending}
                className="flex-1"
              />
              <Button onClick={send} disabled={!ready || sending || !draft.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function ConnectionDot({ ready, status }: { ready: boolean; status?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px]">
      <span className={`w-2 h-2 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
      <span className="text-muted-foreground">{ready ? "Connected" : (status || "Disconnected")}</span>
    </span>
  );
}

function AckIcon({ ack }: { ack: number | null }) {
  if (ack == null) return null;
  if (ack === -1) return <AlertCircle className="h-3 w-3" />;
  if (ack === 0) return <Clock className="h-3 w-3" />;
  if (ack === 1) return <Check className="h-3 w-3" />;
  if (ack === 2) return <CheckCheck className="h-3 w-3" />;
  if (ack === 3) return <CheckCheck className="h-3 w-3 text-sky-200" />;
  return null;
}
