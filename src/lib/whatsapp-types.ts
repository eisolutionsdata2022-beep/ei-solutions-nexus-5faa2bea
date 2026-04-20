// ─── Shared types for the WhatsApp inbox + bulk system ─────────────────

export type WaSessionStatus =
  | "qr"
  | "authenticated"
  | "ready"
  | "auth_failure"
  | "disconnected"
  | "unknown";

export interface WaSessionDoc {
  status: WaSessionStatus;
  ready: boolean;
  clientName?: string;
  qrDataUrl?: string | null;
  qrIssuedAt?: string | null;
  myJid?: string | null;
  myPhone?: string | null;
  pushname?: string | null;
  platform?: string | null;
  readyAt?: string | null;
  lastDisconnectReason?: string;
  error?: string;
}

export interface WaContact {
  id: string;            // = phone (doc id)
  phone: string;
  jid: string;
  displayName: string;
  lastMessage?: string;
  lastMessageAt?: any;   // Firestore Timestamp
  lastDirection?: "in" | "out";
  unreadCount?: number;
  assignedTo?: string | null; // userId of staff/admin
  assignedToName?: string | null;
  tags?: string[];
}

export interface WaMessage {
  id: string;
  messageId: string | null;
  direction: "in" | "out";
  contactPhone: string;
  fromJid: string;
  toJid: string;
  type: string;
  body: string;
  hasMedia: boolean;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  mediaPath?: string | null;     // GCS object path (whatsappMedia/{phone}/{id}.{ext})
  ack: number | null;        // -1 err, 0 pending, 1 server, 2 delivered, 3 read
  timestamp: string;
  createdAt?: any;
}

export type WaCampaignStatus = "queued" | "sending" | "completed" | "failed";

export interface WaCampaign {
  id: string;
  name: string;
  body: string;            // template text with {{name}} tokens
  status: WaCampaignStatus;
  total: number;
  sent: number;
  failed: number;
  createdBy: string;
  createdAt?: any;
  startedAt?: any;
  completedAt?: any;
}

export interface WaCampaignRecipient {
  id: string;
  phone: string;
  name: string;
  status: "pending" | "sent" | "failed";
  messageId?: string;
  error?: string;
  sentAt?: any;
  failedAt?: any;
}
