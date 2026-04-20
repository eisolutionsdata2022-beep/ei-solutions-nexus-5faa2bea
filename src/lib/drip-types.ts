// ─── Auto WhatsApp Drip — shared types ─────────────────────────────────

export interface DripStep {
  /** Days after enrollment before sending. 0 = same day. */
  dayOffset: number;
  /** Hour of day (IST, 0-23). Sent on the next minute the scheduler tick fires after this hour passes. */
  hourOfDay: number;
  /** Message body. Supports {{name}} token. WhatsApp limit 4096 chars. */
  body: string;
}

export type DripEnrollmentStatus =
  | "active"
  | "stopped_replied"
  | "stopped_status"
  | "stopped_optout"
  | "stopped_manual"
  | "completed"
  | "failed";

export interface DripSequence {
  id: string;
  name: string;
  enabled: boolean;
  /** Lead-source values that auto-enroll. Empty array = all sources. */
  leadSources: string[];
  steps: DripStep[];
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface DripEnrollment {
  id: string;            // = leadId (one drip per lead)
  leadId: string;
  phone: string;         // last-10 digits
  name: string;
  sequenceId: string;
  currentStep: number;   // 0-indexed; equals steps.length when completed
  status: DripEnrollmentStatus;
  nextSendAt: string | null; // ISO timestamp of next scheduled send (null when stopped/done)
  enrolledAt: string;
  lastSentAt?: string | null;
  lastMessageId?: string | null;
  stoppedReason?: string;
  failedReason?: string;
}

/** Default seed sequence — admin can edit anytime. */
export const DEFAULT_DRIP_STEPS: DripStep[] = [
  {
    dayOffset: 0,
    hourOfDay: 10,
    body:
      "ഹായ് {{name}}! 🙏 EI Solutions-ൽ താങ്കൾ താല്പര്യം കാണിച്ചതിന് നന്ദി.\n\nHi {{name}}! Thanks for reaching out to EI Solutions. Our team will contact you shortly. Reply to this message anytime — we're here to help. 💬",
  },
  {
    dayOffset: 2,
    hourOfDay: 11,
    body:
      "ഹായ് {{name}}, ഞങ്ങൾ താങ്കളെ ബന്ധപ്പെടാൻ ശ്രമിച്ചു. താങ്കൾക്ക് സൗകര്യപ്രദമായ സമയം അറിയിക്കാമോ?\n\nHi {{name}}, just following up — when's a good time to talk? Reply with your preferred time and we'll call you back.",
  },
  {
    dayOffset: 5,
    hourOfDay: 14,
    body:
      "ഹായ് {{name}}, അവസാന ഓർമ്മപ്പെടുത്തൽ! ഞങ്ങളുടെ services-നെക്കുറിച്ച് കൂടുതൽ അറിയാൻ താല്പര്യമുണ്ടെങ്കിൽ reply ചെയ്യുക.\n\nHi {{name}}, last reminder! If you're still interested in our services, just reply to this message and we'll get you started. 🚀",
  },
];
