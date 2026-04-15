import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Lead, CallLog, LeadHistory, LeadDocument, StaffMember } from "./crm-types";

// ─── Leads ───
export function subscribeLeads(
  callback: (leads: Lead[]) => void,
  onError?: (err: Error) => void,
  staffId?: string
) {
  const q = staffId
    ? query(collection(db, "crmLeads"), where("assignedStaffId", "==", staffId), orderBy("createdAt", "desc"))
    : query(collection(db, "crmLeads"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead)));
  }, (err) => onError?.(err));
}

export async function getNextLeadId(): Promise<string> {
  const snap = await getDocs(collection(db, "crmLeads"));
  const num = snap.size + 1;
  return `LD-${String(num).padStart(4, "0")}`;
}

export async function addLead(lead: Omit<Lead, "id">) {
  return addDoc(collection(db, "crmLeads"), lead);
}

export async function updateLead(id: string, data: Partial<Lead>) {
  return updateDoc(doc(db, "crmLeads", id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteLead(id: string) {
  return deleteDoc(doc(db, "crmLeads", id));
}

// ─── Call Logs ───
export function subscribeCallLogs(
  leadId: string,
  callback: (logs: CallLog[]) => void
) {
  const q = query(
    collection(db, "crmCallLogs"),
    where("leadId", "==", leadId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CallLog)));
  });
}

export async function addCallLog(log: Omit<CallLog, "id">) {
  return addDoc(collection(db, "crmCallLogs"), log);
}

// ─── Lead History ───
export function subscribeLeadHistory(
  leadId: string,
  callback: (history: LeadHistory[]) => void
) {
  const q = query(
    collection(db, "crmLeadHistory"),
    where("leadId", "==", leadId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeadHistory)));
  });
}

export async function addLeadHistory(entry: Omit<LeadHistory, "id">) {
  return addDoc(collection(db, "crmLeadHistory"), entry);
}

// ─── Staff Members ───
export function subscribeStaffMembers(callback: (staff: StaffMember[]) => void) {
  const q = query(collection(db, "users"), where("role", "in", ["staff", "manager"]));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        uid: d.id,
        name: d.data().name || d.data().email?.split("@")[0] || "Staff",
        email: d.data().email || "",
        role: d.data().role || "staff",
      }))
    );
  });
}

// ─── Stats ───
export async function getCRMStats(staffId?: string) {
  const leadsRef = collection(db, "crmLeads");
  const q = staffId
    ? query(leadsRef, where("assignedStaffId", "==", staffId))
    : query(leadsRef);
  const snap = await getDocs(q);
  const leads = snap.docs.map((d) => d.data() as Lead);

  const today = new Date().toISOString().split("T")[0];

  // Get today's call logs
  const callsQ = staffId
    ? query(collection(db, "crmCallLogs"), where("staffId", "==", staffId))
    : query(collection(db, "crmCallLogs"));
  const callSnap = await getDocs(callsQ);
  const todayCalls = callSnap.docs.filter((d) => d.data().createdAt?.startsWith(today)).length;

  return {
    totalLeads: leads.length,
    todayCalls,
    converted: leads.filter((l) => l.status === "Converted").length,
    pendingFollowUps: leads.filter((l) => l.status === "Follow-up").length,
    paymentCompleted: leads.filter((l) => l.paymentStatus === "Paid").length,
    paymentPending: leads.filter((l) => l.paymentStatus === "Pending").length,
    newLeads: leads.filter((l) => l.status === "New").length,
    contacted: leads.filter((l) => l.status === "Contacted").length,
  };
}

// ─── Document Upload/Delete ───
export async function uploadLeadDocument(
  leadId: string,
  file: File,
  uploadedBy: string
): Promise<LeadDocument> {
  const timestamp = Date.now();
  const path = `crm-documents/${leadId}/${timestamp}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const docEntry: LeadDocument = {
    name: file.name,
    url,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
  };

  // Get current lead docs and append
  const leadDoc = await getDoc(doc(db, "crmLeads", leadId));
  const currentDocs: LeadDocument[] = leadDoc.data()?.documents || [];
  await updateDoc(doc(db, "crmLeads", leadId), {
    documents: [...currentDocs, docEntry],
    updatedAt: new Date().toISOString(),
  });

  return docEntry;
}

export async function deleteLeadDocument(leadId: string, docUrl: string) {
  // Remove from Firestore array
  const leadDoc = await getDoc(doc(db, "crmLeads", leadId));
  const currentDocs: LeadDocument[] = leadDoc.data()?.documents || [];
  const updatedDocs = currentDocs.filter((d) => d.url !== docUrl);
  await updateDoc(doc(db, "crmLeads", leadId), {
    documents: updatedDocs,
    updatedAt: new Date().toISOString(),
  });

  // Try to delete from storage (may fail if URL format differs)
  try {
    const storageRef = ref(storage, docUrl);
    await deleteObject(storageRef);
  } catch {
    // Storage deletion is best-effort
  }
}
