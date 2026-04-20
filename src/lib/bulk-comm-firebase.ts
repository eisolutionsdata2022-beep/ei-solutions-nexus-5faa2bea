import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  onSnapshot, query, where, orderBy, setDoc, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  LandingEnquiry, UploadedLead, BulkEmailCampaign, BulkEmailRecipient,
  AudienceFilter, UnifiedContact, OptOut,
} from "./bulk-comm-types";

// ─── Landing enquiries ──────────────────────────────────────────────
export async function submitLandingEnquiry(
  data: Omit<LandingEnquiry, "id" | "createdAt" | "status" | "source">
) {
  return addDoc(collection(db, "landingEnquiries"), {
    ...data,
    status: "new" as const,
    source: "landing-page" as const,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeLandingEnquiries(cb: (rows: LandingEnquiry[]) => void) {
  const q = query(collection(db, "landingEnquiries"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LandingEnquiry)))
  );
}

export async function updateLandingEnquiry(id: string, data: Partial<LandingEnquiry>) {
  return updateDoc(doc(db, "landingEnquiries", id), data);
}

// ─── Uploaded leads ─────────────────────────────────────────────────
export function subscribeUploadedLeads(cb: (rows: UploadedLead[]) => void) {
  const q = query(collection(db, "uploadedLeads"), orderBy("uploadedAt", "desc"));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UploadedLead)))
  );
}

export async function bulkInsertUploadedLeads(
  leads: Omit<UploadedLead, "id" | "uploadedAt">[]
) {
  // Dedupe by phone or email within batch
  const seen = new Set<string>();
  const unique = leads.filter((l) => {
    const k = (l.email || l.phone || "").toLowerCase().trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Cross-check existing leads (by email)
  const existing = await getDocs(collection(db, "uploadedLeads"));
  const existingKeys = new Set(
    existing.docs.map((d) => (d.data().email || d.data().phone || "").toLowerCase().trim())
  );

  const fresh = unique.filter((l) => {
    const k = (l.email || l.phone || "").toLowerCase().trim();
    return !existingKeys.has(k);
  });

  // Batch write (max 500 per batch)
  const now = new Date().toISOString();
  for (let i = 0; i < fresh.length; i += 400) {
    const batch = writeBatch(db);
    fresh.slice(i, i + 400).forEach((lead) => {
      const ref = doc(collection(db, "uploadedLeads"));
      batch.set(ref, { ...lead, uploadedAt: now });
    });
    await batch.commit();
  }

  return { inserted: fresh.length, duplicates: leads.length - fresh.length };
}

export async function deleteUploadedLead(id: string) {
  return deleteDoc(doc(db, "uploadedLeads", id));
}

// ─── Opt-outs (suppression list) ────────────────────────────────────
export async function addOptOut(email: string, reason: OptOut["reason"] = "user-unsubscribe") {
  const id = email.toLowerCase().trim();
  return setDoc(doc(db, "bulkEmailOptOuts", id), {
    email: id, reason, createdAt: new Date().toISOString(),
  });
}

export async function getOptOuts(): Promise<Set<string>> {
  const snap = await getDocs(collection(db, "bulkEmailOptOuts"));
  return new Set(snap.docs.map((d) => d.id));
}

// ─── Campaigns ──────────────────────────────────────────────────────
export async function createCampaign(
  data: Omit<BulkEmailCampaign, "id" | "createdAt">
) {
  return addDoc(collection(db, "bulkEmailCampaigns"), {
    ...data,
    createdAt: new Date().toISOString(),
  });
}

export async function updateCampaign(id: string, data: Partial<BulkEmailCampaign>) {
  return updateDoc(doc(db, "bulkEmailCampaigns", id), data);
}

export function subscribeCampaigns(cb: (rows: BulkEmailCampaign[]) => void) {
  const q = query(collection(db, "bulkEmailCampaigns"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BulkEmailCampaign)))
  );
}

export async function getCampaign(id: string) {
  const s = await getDoc(doc(db, "bulkEmailCampaigns", id));
  return s.exists() ? ({ id: s.id, ...s.data() } as BulkEmailCampaign) : null;
}

export function subscribeCampaignRecipients(
  campaignId: string,
  cb: (rows: BulkEmailRecipient[]) => void
) {
  const q = query(
    collection(db, "bulkEmailRecipients"),
    where("campaignId", "==", campaignId)
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BulkEmailRecipient)))
  );
}

// ─── Audience resolver ──────────────────────────────────────────────
export async function resolveAudience(filter: AudienceFilter): Promise<UnifiedContact[]> {
  const out: UnifiedContact[] = [];

  // 1. Retailers
  if (filter.sources.includes("retailer")) {
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "retailer"))
    );
    usersSnap.docs.forEach((d) => {
      const u = d.data();
      if (!u.email) return;
      // Active = has logged in within 30 days, Inactive = otherwise
      const last = u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0;
      const isActive = last > Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (filter.retailerStatus === "active" && !isActive) return;
      if (filter.retailerStatus === "inactive" && isActive) return;
      out.push({
        id: `retailer:${d.id}`,
        source: "retailer",
        name: u.name || u.email.split("@")[0],
        email: u.email,
        phone: u.phone || "",
        meta: { kyc: u.kycStatus, lastLoginAt: u.lastLoginAt || null },
      });
    });
  }

  // 2. Landing enquiries
  if (filter.sources.includes("enquiry")) {
    const eSnap = await getDocs(collection(db, "landingEnquiries"));
    eSnap.docs.forEach((d) => {
      const e = d.data() as LandingEnquiry;
      if (filter.enquiryStatus && filter.enquiryStatus !== "all" && e.status !== filter.enquiryStatus) return;
      if (!e.email && !e.phone) return;
      out.push({
        id: `enquiry:${d.id}`,
        source: "enquiry",
        name: e.name || "Enquirer",
        email: e.email || "",
        phone: e.phone || "",
        meta: { interestedIn: e.interestedIn || null },
      });
    });
  }

  // 3. CRM leads (existing crmLeads collection)
  if (filter.sources.includes("crmLead")) {
    const cSnap = await getDocs(collection(db, "crmLeads"));
    cSnap.docs.forEach((d) => {
      const l = d.data();
      if (!l.phone && !l.email) return;
      out.push({
        id: `crmLead:${d.id}`,
        source: "crmLead",
        name: l.name || "Lead",
        email: l.email || "",
        phone: l.phone || "",
        meta: { course: l.courseInterested || null, status: l.status || null },
      });
    });
  }

  // 4. Uploaded leads
  if (filter.sources.includes("uploaded")) {
    const uSnap = await getDocs(collection(db, "uploadedLeads"));
    uSnap.docs.forEach((d) => {
      const u = d.data() as UploadedLead;
      if (filter.uploadedTag && u.tag !== filter.uploadedTag) return;
      if (!u.email && !u.phone) return;
      out.push({
        id: `uploaded:${d.id}`,
        source: "uploaded",
        name: u.name || "Lead",
        email: u.email || "",
        phone: u.phone || "",
        meta: { tag: u.tag || null },
      });
    });
  }

  // Custom-only mode
  if (filter.customIds && filter.customIds.length > 0) {
    const set = new Set(filter.customIds);
    return out.filter((c) => set.has(c.id));
  }

  // Exclude opt-outs
  if (filter.excludeOptedOut) {
    const optOuts = await getOptOuts();
    return out.filter((c) => !optOuts.has(c.email.toLowerCase().trim()));
  }

  return out;
}
