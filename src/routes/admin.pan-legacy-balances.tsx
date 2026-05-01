/**
 * Admin — Legacy PAN balance migration.
 *
 * Two responsibilities:
 *  1. Import the master `pan_legacy_balances` collection from the seed JSON
 *     bundled in `/data/legacy-pan-balances.json` (one-click, idempotent).
 *  2. Approve / reject retailer transfer requests. On approval the amount is
 *     atomically credited to the retailer's platform wallet and the legacy
 *     balance is marked claimed.
 *
 * No PAN business logic touched — this is a pure money-migration tool.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, runTransaction, updateDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { atomicCredit } from "@/lib/firebase-transactions";
import { useAuth } from "@/lib/auth-context";
import {
  clearUnclaimedLegacyBalances,
  countLegacyBalances,
  subscribeAllTransferRequests,
  upsertLegacyBalance,
} from "@/lib/pan-legacy-balance";
import type { PanLegacyTransferRequest } from "@/lib/pan-legacy-balance-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Trash2,
  Upload,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pan-legacy-balances")({
  ssr: false,
  component: AdminPanLegacyBalances,
});

interface SeedFile {
  importedAt: string;
  source: string;
  count: number;
  totalBalance: number;
  records: Array<{
    username: string;
    mobile: string;
    name: string;
    balance: number;
  }>;
}

function AdminPanLegacyBalances() {
  const { appUser } = useAuth();

  const [stats, setStats] = useState<{
    total: number;
    unclaimed: number;
    totalBalance: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  const [requests, setRequests] = useState<PanLegacyTransferRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "pending" | "approved" | "rejected">("pending");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refreshStats();
    return subscribeAllTransferRequests(setRequests);
  }, []);

  async function refreshStats() {
    try {
      setStats(await countLegacyBalances());
    } catch {
      /* ignore */
    }
  }

  async function handleImport() {
    if (!confirm("Import 300 legacy balances from /data/legacy-pan-balances.json? This is idempotent — running it again is safe.")) return;
    setImporting(true);
    try {
      const res = await fetch("/data/legacy-pan-balances.json");
      if (!res.ok) throw new Error("Seed JSON not found");
      const data: SeedFile = await res.json();
      setImportProgress({ done: 0, total: data.records.length });

      for (let i = 0; i < data.records.length; i++) {
        const r = data.records[i];
        await upsertLegacyBalance({
          username: r.username,
          mobile: r.mobile,
          name: r.name,
          balance: r.balance,
          remaining: r.balance,
          claimed: false,
          importedAt: data.importedAt,
        });
        if (i % 10 === 0) setImportProgress({ done: i + 1, total: data.records.length });
      }
      setImportProgress({ done: data.records.length, total: data.records.length });
      toast.success(`Imported ${data.records.length} balances (₹${data.totalBalance.toLocaleString()})`);
      await refreshStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function handleDownloadTemplate() {
    const sample = [
      { Username: "RMPMCST-9447175704", Mobile: "9447175704", Name: "Sample Retailer", Balance: 1250.5 },
      { Username: "RMPMCST-9876543210", Mobile: "9876543210", Name: "Another Retailer", Balance: 500 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 28 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LegacyBalances");
    XLSX.writeFile(wb, "legacy-pan-balances-template.xlsx");
    toast.success("Template downloaded — fill Username, Mobile, Name, Balance");
  }

  async function handleUploadFile(file: File) {
    setUploading(true);
    setUploadProgress({ done: 0, total: 0 });
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("Sheet not found in file");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const norm = (k: string) => k.trim().toLowerCase();
      const records = rows
        .map((row) => {
          const m: Record<string, unknown> = {};
          Object.keys(row).forEach((k) => (m[norm(k)] = row[k]));
          const username = String(m["username"] ?? m["vle id"] ?? m["vleid"] ?? "").trim().toUpperCase();
          const mobile = String(m["mobile"] ?? m["phone"] ?? "").replace(/\D/g, "").slice(-10);
          const name = String(m["name"] ?? m["full name"] ?? "").trim();
          const balance = Number(String(m["balance"] ?? m["amount"] ?? "0").replace(/[,₹\s]/g, ""));
          return { username, mobile, name, balance };
        })
        .filter((r) => r.username && r.mobile.length === 10 && Number.isFinite(r.balance) && r.balance > 0);

      if (records.length === 0) {
        throw new Error("No valid rows found. Required columns: Username, Mobile, Name, Balance");
      }

      if (!confirm(`Upload ${records.length} legacy balance records? Existing records with the same Username will be updated.`)) {
        setUploading(false);
        return;
      }

      setUploadProgress({ done: 0, total: records.length });
      const importedAt = new Date().toISOString();
      let total = 0;
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        await upsertLegacyBalance({
          username: r.username,
          mobile: r.mobile,
          name: r.name,
          balance: r.balance,
          remaining: r.balance,
          claimed: false,
          importedAt,
        });
        total += r.balance;
        if (i % 5 === 0) setUploadProgress({ done: i + 1, total: records.length });
      }
      setUploadProgress({ done: records.length, total: records.length });
      toast.success(`Uploaded ${records.length} records (₹${total.toLocaleString("en-IN")})`);
      await refreshStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleClearAll() {
    if (!confirm("Delete ALL UNCLAIMED legacy balance records? Already-claimed records will be kept for audit. This cannot be undone.")) return;
    if (!confirm("Are you absolutely sure? Click OK to confirm deletion.")) return;
    setClearing(true);
    try {
      const res = await clearUnclaimedLegacyBalances();
      toast.success(`Deleted ${res.deleted} unclaimed · kept ${res.kept} claimed`);
      await refreshStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setClearing(false);
    }
  }

  async function handleAction(
    req: PanLegacyTransferRequest,
    action: "approved" | "rejected",
  ) {
    if (!req.id) return;
    setProcessing(req.id);
    try {
      const note = remarks[req.id] || "";

      if (action === "approved") {
        // Mark legacy balance claimed atomically (prevents double claim).
        await runTransaction(db, async (tx) => {
          const balRef = doc(db, "pan_legacy_balances", req.legacyUsername);
          const reqRef = doc(db, "pan_legacy_transfers", req.id!);
          const balSnap = await tx.get(balRef);
          const reqSnap = await tx.get(reqRef);
          if (!balSnap.exists()) throw new Error("Legacy balance not found");
          if (!reqSnap.exists()) throw new Error("Request missing");
          const bal = balSnap.data() as { remaining?: number; balance: number; claimed?: boolean };
          const remaining = bal.remaining ?? bal.balance;
          if (bal.claimed) throw new Error("Balance already claimed");
          if (remaining < req.amount) throw new Error("Remaining balance is less than requested amount");
          tx.update(balRef, {
            remaining: remaining - req.amount,
            claimed: remaining - req.amount <= 0,
            claimedBy: req.retailerId,
            claimedAt: new Date().toISOString(),
          });
          tx.update(reqRef, {
            status: "approved",
            remarks: note,
            processedAt: new Date().toISOString(),
            processedBy: appUser?.uid || "admin",
          });
        });

        await atomicCredit(req.retailerId, req.amount, {
          source: "pan_legacy_transfer",
          description: `Legacy PAN portal balance transfer · ${req.legacyUsername}`,
          legacyUsername: req.legacyUsername,
          requestId: req.id,
        });
        toast.success(`₹${req.amount} credited to ${req.retailerEmail}`);
      } else {
        await updateDoc(doc(db, "pan_legacy_transfers", req.id), {
          status: "rejected",
          remarks: note,
          processedAt: new Date().toISOString(),
          processedBy: appUser?.uid || "admin",
        });
        toast.success("Request rejected");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setProcessing(null);
    }
  }

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.retailerEmail.toLowerCase().includes(q) ||
        r.legacyUsername.toLowerCase().includes(q) ||
        r.legacyMobile.includes(q) ||
        (r.legacyName || "").toLowerCase().includes(q)
      );
    });
  }, [requests, search, statusFilter]);

  const pendingTotal = requests
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Legacy PAN Wallet Migration</h1>
        <p className="text-muted-foreground">
          One-time balance carry-forward from the old mallikarecharge portal.
          Approve requests to atomically credit the retailer's platform wallet.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Database className="h-5 w-5 text-blue-600" />}
          label="Imported balances"
          value={stats ? stats.total.toString() : "—"}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-emerald-600" />}
          label="Unclaimed (₹)"
          value={stats ? `₹${stats.totalBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Pending requests"
          value={requests.filter((r) => r.status === "pending").length.toString()}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-violet-600" />}
          label="Pending transfer (₹)"
          value={`₹${pendingTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
        />
      </div>

      {/* Import seed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Import Seed Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Loads <code>/data/legacy-pan-balances.json</code> into Firestore.
            Idempotent — safe to re-run if the seed file is updated.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importing {importProgress.done}/{importProgress.total}…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import / Re-sync Seed
                </>
              )}
            </Button>
            <Button variant="outline" onClick={refreshStats}>
              Refresh stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              {(["pending", "approved", "rejected", "all"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-md capitalize ${
                    statusFilter === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, PSA ID, mobile…"
                className="pl-8"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No requests match the current filter.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((req) => (
                <div
                  key={req.id}
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">
                          {req.legacyUsername}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {req.legacyName} · {req.legacyMobile} → {req.retailerEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        ₹{req.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {req.status === "pending" ? (
                    <div className="flex flex-wrap gap-2 items-end pt-2 border-t">
                      <div className="flex-1 min-w-[200px]">
                        <Label className="text-xs">Admin remark (optional)</Label>
                        <Input
                          value={remarks[req.id!] || ""}
                          onChange={(e) =>
                            setRemarks((p) => ({ ...p, [req.id!]: e.target.value }))
                          }
                          placeholder="Verified with old portal records…"
                          className="h-8"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAction(req, "approved")}
                        disabled={processing === req.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {processing === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        Approve & Credit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(req, "rejected")}
                        disabled={processing === req.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  ) : (
                    req.remarks && (
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        Remark: {req.remarks}
                      </p>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Approved</Badge>;
  if (status === "rejected")
    return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}
