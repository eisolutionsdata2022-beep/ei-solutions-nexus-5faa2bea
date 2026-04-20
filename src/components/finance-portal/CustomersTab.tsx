/**
 * Customers tab — dark studio theme.
 * Allows creating customers with KYC fields and viewing the list.
 */
import { useMemo, useState } from "react";
import { Users, Plus, Search, Phone, ShieldCheck, Eye, Camera, Upload, FileText, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  addCustomer,
  getNextCustomerCode,
  updateCustomer,
  uploadCustomerPhoto,
  uploadCustomerDoc,
} from "@/lib/finance-firebase";
import { StudioCameraCapture } from "./StudioCameraCapture";
import type { FinanceCustomer, KycStatus } from "@/lib/finance-types";
import {
  StudioCard,
  StudioSectionTitle,
  StudioInput,
  StudioTextarea,
  StudioButton,
  StudioBadge,
  StudioEmpty,
  StudioModal,
} from "./StudioShell";

const KYC_TONE: Record<KycStatus, "warning" | "success" | "danger"> = {
  Pending: "warning",
  Verified: "success",
  Rejected: "danger",
};

interface Props {
  ownerId: string;
  ownerEmail: string;
  customers: FinanceCustomer[];
}

export function CustomersTab({ ownerId, ownerEmail, customers }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<FinanceCustomer | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(q) ||
        c.mobile?.includes(q) ||
        c.customerCode?.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div className="space-y-4">
      <StudioSectionTitle
        eyebrow="Workspace"
        title="Customers"
        right={
          <StudioButton onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> New Customer
          </StudioButton>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, mobile, or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
        />
      </div>

      {filtered.length === 0 ? (
        <StudioEmpty
          icon={<Users className="h-5 w-5" />}
          title={customers.length === 0 ? "No customers yet" : "No matching customers"}
          hint={customers.length === 0 ? "Click 'New Customer' to onboard your first borrower." : "Try a different search term."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <StudioCard key={c.id} className="hover:border-white/20">
              <div className="flex items-start gap-3">
                {c.photoUrl ? (
                  <img
                    src={c.photoUrl}
                    alt={c.fullName}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-cyan-400/40"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-sm font-bold text-cyan-300">
                    {c.fullName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-100">{c.fullName}</p>
                  <p className="font-mono text-[10px] text-cyan-300/80">{c.customerCode}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <Phone className="h-3 w-3" /> {c.mobile}
                  </p>
                </div>
                <StudioBadge tone={KYC_TONE[c.kycStatus]}>{c.kycStatus}</StudioBadge>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="font-mono text-[10px] text-slate-500">
                  Aadhaar: {c.aadhaarNo ? `••••${c.aadhaarNo.slice(-4)}` : "—"}
                </span>
                <button
                  onClick={() => setDetail(c)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  <Eye className="h-3 w-3" /> View
                </button>
              </div>
            </StudioCard>
          ))}
        </div>
      )}

      <NewCustomerModal
        open={showNew}
        onClose={() => setShowNew(false)}
        ownerId={ownerId}
        ownerEmail={ownerEmail}
      />
      <CustomerDetailModal customer={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function NewCustomerModal({
  open,
  onClose,
  ownerId,
  ownerEmail,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  ownerEmail: string;
}) {
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    altMobile: "",
    address: "",
    aadhaarNo: "",
    panNo: "",
    notes: "",
  });
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [showCam, setShowCam] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setForm({
      fullName: "",
      mobile: "",
      altMobile: "",
      address: "",
      aadhaarNo: "",
      panNo: "",
      notes: "",
    });
    setPhotoData(null);
  }

  async function save() {
    if (!form.fullName.trim() || !form.mobile.trim() || !form.aadhaarNo.trim()) {
      toast.error("Name, mobile, and Aadhaar are required");
      return;
    }
    setSaving(true);
    try {
      const code = await getNextCustomerCode(ownerId);
      const now = new Date().toISOString();
      const id = await addCustomer({
        retailerId: ownerId,
        branchId: null,
        customerCode: code,
        fullName: form.fullName.trim(),
        mobile: form.mobile.trim(),
        altMobile: form.altMobile.trim() || undefined,
        address: form.address.trim(),
        aadhaarNo: form.aadhaarNo.trim(),
        panNo: form.panNo.trim() || undefined,
        kycStatus: "Pending",
        notes: form.notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: ownerEmail,
      });
      // Upload photo (if captured) AFTER doc creation so we have the customer id
      if (photoData) {
        try {
          const photoUrl = await uploadCustomerPhoto(ownerId, id, photoData);
          await updateCustomer(id, { photoUrl });
        } catch (uploadErr: any) {
          // Don't block customer creation on a photo upload failure
          toast.warning(
            `Customer ${code} created, but photo upload failed: ${uploadErr?.message || "unknown error"}`,
          );
          reset();
          onClose();
          return;
        }
      }
      toast.success(`Customer ${code} created`);
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <StudioModal open={open} onClose={onClose} title="New Customer" width="max-w-xl">
      <div className="space-y-3">
        {/* Photo capture row */}
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          {photoData ? (
            <img
              src={photoData}
              alt="Captured"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-cyan-400/40"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/15 to-violet-500/15 ring-1 ring-white/10">
              <Camera className="h-7 w-7 text-slate-400" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-200">Customer photo</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Optional — captured directly from your camera.
            </p>
            <button
              type="button"
              onClick={() => setShowCam(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20"
            >
              <Camera className="h-3.5 w-3.5" />
              {photoData ? "Retake" : "Capture photo"}
            </button>
          </div>
        </div>

        <StudioInput
          label="Full Name *"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <StudioInput
            label="Mobile *"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          />
          <StudioInput
            label="Alt Mobile"
            value={form.altMobile}
            onChange={(e) => setForm({ ...form, altMobile: e.target.value })}
          />
        </div>
        <StudioTextarea
          label="Address"
          rows={2}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <StudioInput
            label="Aadhaar No *"
            value={form.aadhaarNo}
            onChange={(e) => setForm({ ...form, aadhaarNo: e.target.value })}
          />
          <StudioInput
            label="PAN No"
            value={form.panNo}
            onChange={(e) => setForm({ ...form, panNo: e.target.value })}
          />
        </div>
        <StudioTextarea
          label="Notes"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <StudioButton variant="ghost" onClick={onClose}>
          Cancel
        </StudioButton>
        <StudioButton onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Customer"}
        </StudioButton>
      </div>
    </StudioModal>
    <StudioCameraCapture
      open={showCam}
      onClose={() => setShowCam(false)}
      onCapture={setPhotoData}
      title="Capture Customer Photo"
    />
    </>
  );
}

function CustomerDetailModal({
  customer,
  onClose,
}: {
  customer: FinanceCustomer | null;
  onClose: () => void;
}) {
  if (!customer) return null;
  async function setKyc(status: "Verified" | "Rejected") {
    if (!customer) return;
    await updateCustomer(customer.id, { kycStatus: status });
    toast.success(`KYC ${status}`);
  }
  return (
    <StudioModal open onClose={onClose} title={customer.fullName} width="max-w-lg">
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          {customer.photoUrl ? (
            <img
              src={customer.photoUrl}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-cyan-400/40"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-lg font-bold text-cyan-300">
              {customer.fullName[0]}
            </div>
          )}
          <div>
            <p className="font-mono text-xs text-cyan-300/80">{customer.customerCode}</p>
            <p className="text-slate-300">{customer.mobile}</p>
            <StudioBadge tone={KYC_TONE[customer.kycStatus]}>
              KYC: {customer.kycStatus}
            </StudioBadge>
          </div>
        </div>
        <Info label="Aadhaar" value={customer.aadhaarNo} />
        {customer.panNo && <Info label="PAN" value={customer.panNo} />}
        {customer.altMobile && <Info label="Alt Mobile" value={customer.altMobile} />}
        <Info label="Address" value={customer.address || "—"} />
        {customer.notes && <Info label="Notes" value={customer.notes} />}
      </div>
      {customer.kycStatus === "Pending" && (
        <div className="mt-5 flex justify-end gap-2">
          <StudioButton variant="danger" onClick={() => setKyc("Rejected")}>
            Reject KYC
          </StudioButton>
          <StudioButton onClick={() => setKyc("Verified")}>
            <ShieldCheck className="h-4 w-4" /> Verify KYC
          </StudioButton>
        </div>
      )}
    </StudioModal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-1.5">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}
