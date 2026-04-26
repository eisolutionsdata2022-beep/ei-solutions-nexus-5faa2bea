import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Search, MessageCircle, Loader2, CheckCheck, Check, Clock, AlertCircle,
  UserCheck, Paperclip, X, FileText, Download, Image as ImageIcon, Phone, Copy, ExternalLink,
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
  listAssignableUsers, subscribeSession, ensureContact,
} from "@/lib/whatsapp-firebase";
import type { WaContact, WaMessage, WaSessionDoc } from "@/lib/whatsapp-types";
import { sendWhatsAppMessage } from "@/lib/whatsapp-bridge.functions";
import { QuickReplyPicker } from "./QuickReplyPicker";
import { NewChatDialog } from "./NewChatDialog";

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

  // Start new chat from CRM/uploaded leads picker
  const handleNewChat = async (phone: string, name: string) => {
    try {
      await ensureContact({
        phone,
        displayName: name || phone,
        assignedTo: scope === "staff" ? appUser?.uid || null : null,
        assignedToName: scope === "staff" ? appUser?.name || appUser?.email || null : null,
      });
      setActivePhone(phone);
    } catch (e: any) {
      toast.error(e?.message || "Failed to start chat");
    }
  };

  const filteredContacts = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter((c) =>
      c.displayName.toLowerCase().includes(s) || c.phone.includes(s)
    );
  }, [contacts, search]);

  const activeContact = contacts.find((c) => c.phone === activePhone) || null;

  const send = async () => {
    if ((!draft.trim() && !attachment) || !activePhone || sending) return;
    setSending(true);
    const text = draft.trim();
    const att = attachment;
    setDraft("");
    setAttachment(null);
    try {
      const res = await sendWhatsAppMessage({
        data: {
          phone: activePhone,
          body: att ? undefined : text,
          mediaBase64: att?.base64,
          mediaMime: att?.mime,
          caption: att && text ? text : undefined,
        },
      });
      if (!res.ok) {
        toast.error(res.error || "Send failed");
        setDraft(text);
        setAttachment(att);
      }
    } catch (e: any) {
      toast.error(e?.message || "Send failed");
      setDraft(text);
      setAttachment(att);
    } finally {
      setSending(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-pick same file
    if (!file) return;
    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) {
      toast.error("Only images and PDF files are supported");
      return;
    }
    const MAX_MB = 12;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large — max ${MAX_MB} MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      setAttachment({
        name: file.name,
        mime: file.type,
        base64,
        sizeKB: Math.round(file.size / 1024),
        previewUrl: file.type.startsWith("image/") ? dataUrl : undefined,
      });
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsDataURL(file);
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
          <div className="mt-2 flex justify-end">
            <NewChatDialog
              scope={scope}
              staffId={appUser?.uid}
              onPick={handleNewChat}
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
              <ContactAvatar
                name={c.displayName || c.phone}
                picUrl={c.profilePicUrl}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{c.displayName || c.phone}</p>
                  {c.unreadCount && c.unreadCount > 0 ? (
                    <Badge className="bg-emerald-600 text-white text-[10px] h-4 px-1.5">{c.unreadCount}</Badge>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage || `+${c.phone}`}</p>
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
                    <div className={`max-w-[78%] rounded-2xl px-1.5 py-1.5 text-sm shadow-sm ${
                      isOut ? "bg-emerald-600 text-white" : "bg-card border border-border text-foreground"
                    }`}>
                      <MessageMedia m={m} isOut={isOut} />
                      {m.body && (
                        <p className="px-1.5 pt-1 whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                      {!m.body && !m.hasMedia && (
                        <p className="px-1.5 pt-1 italic opacity-70">(empty)</p>
                      )}
                      <div className={`flex items-center justify-end gap-1 mt-1 px-1.5 pb-0.5 text-[10px] ${isOut ? "text-emerald-50/80" : "text-muted-foreground"}`}>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {isOut && <AckIcon ack={m.ack} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attachment preview strip */}
            {attachment && (
              <div className="px-3 pt-2 -mb-1">
                <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/40">
                  {attachment.previewUrl ? (
                    <img src={attachment.previewUrl} alt={attachment.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-rose-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{attachment.name}</p>
                    <p className="text-[10px] text-muted-foreground">{attachment.mime} · {attachment.sizeKB} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAttachment(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="p-3 border-t flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={onPickFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={!ready || sending}
                title="Attach image or PDF"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <QuickReplyPicker
                contactName={activeContact.displayName || ""}
                disabled={!ready || sending}
                onPick={(text) => setDraft((prev) => (prev ? `${prev}\n${text}` : text))}
              />
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={ready ? (attachment ? "Add a caption (optional)…" : "Type a message…") : "WhatsApp not connected — cannot send"}
                disabled={!ready || sending}
                className="flex-1"
              />
              <Button
                onClick={send}
                disabled={!ready || sending || (!draft.trim() && !attachment)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function MessageMedia({ m, isOut }: { m: WaMessage; isOut: boolean }) {
  if (!m.hasMedia) return null;
  const url = m.mediaUrl || null;
  const mime = m.mediaMime || "";
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";

  if (!url) {
    return (
      <div className={`flex items-center gap-2 px-2 py-2 rounded-lg ${isOut ? "bg-emerald-700/40" : "bg-muted"}`}>
        <ImageIcon className="h-4 w-4 opacity-70" />
        <span className="text-xs opacity-80">Media — loading…</span>
      </div>
    );
  }

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt="attachment" className="rounded-lg max-h-64 w-auto object-cover" loading="lazy" />
      </a>
    );
  }

  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${isOut ? "bg-emerald-700/40 hover:bg-emerald-700/60" : "bg-muted hover:bg-muted/80"} transition`}
      >
        <FileText className="h-5 w-5 shrink-0" />
        <span className="text-xs font-medium flex-1 truncate">PDF document</span>
        <Download className="h-3.5 w-3.5 opacity-70" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${isOut ? "bg-emerald-700/40 hover:bg-emerald-700/60" : "bg-muted hover:bg-muted/80"} transition`}
    >
      <Paperclip className="h-4 w-4 shrink-0" />
      <span className="text-xs flex-1 truncate">{mime || "Attachment"}</span>
      <Download className="h-3.5 w-3.5 opacity-70" />
    </a>
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
