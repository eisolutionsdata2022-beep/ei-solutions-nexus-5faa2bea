/**
 * Admin tool — detect & reverse duplicate UTI coupon refunds.
 *
 * Background: a bug in UtiCouponTab caused failed coupon purchases to
 * refund the wallet TWICE (once in the failure branch, again in the outer
 * catch when createUtiCoupon threw after the credit). The bug is now fixed
 * but several retailers were over-credited.
 *
 * This page scans the `transactions` collection for `pan-portal` entries
 * grouped by orderId. Any orderId with 1 debit + 2 (or more) credits of
 * the SAME amount = duplicate refund → reverse the extra credit(s) by
 * debiting the wallet and writing an audit transaction.
 *
 * Safe to run multiple times — already-reversed orders are tagged with
 * `reversedDuplicate: true` and skipped on subsequent runs.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pan-refund-repair")({
  component: PanRefundRepairPage,
});

interface DuplicateGroup {
  orderId: string;
  userId: string;
  amount: number;          // per-credit amount (extra credit value)
  extraCredits: number;    // how many EXTRA credits beyond the first
  extraTotal: number;      // = amount × extraCredits
  txIds: string[];         // the extra credit transaction docIds to mark
  description: string;
}

function PanRefundRepairPage() {
  const { appUser } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [scanned, setScanned] = useState(false);
  const [reversedCount, setReversedCount] = useState(0);

  const isAdmin = appUser?.role === "admin";

  async function scan() {
    if (!isAdmin) return;
    setScanning(true);
    setGroups([]);
    setScanned(false);
    try {
      // Pull only pan-portal transactions (smaller set than full table)
      const q = query(collection(db, "transactions"), where("source", "==", "pan-portal"));
      const snap = await getDocs(q);
      const byOrder = new Map<string, Array<{ id: string; data: any }>>();
      snap.forEach((d) => {
        const data = d.data();
        const orderId = String(data.orderId || "");
        if (!orderId) return;
        if (!byOrder.has(orderId)) byOrder.set(orderId, []);
        byOrder.get(orderId)!.push({ id: d.id, data });
      });

      const dups: DuplicateGroup[] = [];
      for (const [orderId, txs] of byOrder.entries()) {
        const debits = txs.filter((t) => t.data.type === "debit");
        const credits = txs.filter((t) => t.data.type === "credit");
        if (debits.length !== 1 || credits.length < 2) continue;

        // Only treat as duplicate if multiple credits share the SAME amount
        // as the debit (i.e. full-batch refund repeated). Partial refunds
        // legitimately have different amounts and must be left alone.
        const debitAmt = Number(debits[0].data.amount || 0);
        const sameAmtCredits = credits.filter(
          (c) => Number(c.data.amount || 0) === debitAmt && !c.data.reversedDuplicate,
        );
        if (sameAmtCredits.length < 2) continue;

        // Sort by createdAt; first credit is the legit refund, rest are duplicates.
        sameAmtCredits.sort((a, b) =>
          String(a.data.createdAt || "").localeCompare(String(b.data.createdAt || "")),
        );
        const extras = sameAmtCredits.slice(1);
        dups.push({
          orderId,
          userId: String(debits[0].data.userId || ""),
          amount: debitAmt,
          extraCredits: extras.length,
          extraTotal: debitAmt * extras.length,
          txIds: extras.map((e) => e.id),
          description: String(extras[0].data.description || ""),
        });
      }
      dups.sort((a, b) => b.extraTotal - a.extraTotal);
      setGroups(dups);
      setScanned(true);
      toast.success(`Scan complete — ${dups.length} affected order${dups.length === 1 ? "" : "s"} found`);
    } catch (err) {
      console.error("[refund-repair] scan failed:", err);
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function reverseAll() {
    if (!isAdmin || groups.length === 0) return;
    if (!confirm(`Reverse ₹${groups.reduce((s, g) => s + g.extraTotal, 0)} from ${groups.length} retailer(s)? This debits their wallets.`)) return;

    setReversing(true);
    let ok = 0;
    let fail = 0;
    for (const g of groups) {
      try {
        const walletRef = doc(db, "wallets", g.userId);
        const newBalance = await runTransaction(db, async (tx) => {
          const w = await tx.get(walletRef);
          if (!w.exists()) throw new Error("Wallet missing");
          const current = Number(w.data().balance || 0);
          // Deduct the extra refund. Allow negative balance — admin must
          // know the user is in debt rather than silently failing.
          const updated = current - g.extraTotal;
          tx.update(walletRef, { balance: updated });
          return updated;
        });

        // Audit transaction
        await addDoc(collection(db, "transactions"), {
          userId: g.userId,
          amount: g.extraTotal,
          type: "debit",
          source: "pan-portal",
          description: `Duplicate refund reversal — ${g.orderId} (${g.extraCredits} extra credit${g.extraCredits === 1 ? "" : "s"})`,
          orderId: g.orderId,
          reversalOf: g.txIds,
          adminUserId: appUser!.uid,
          createdAt: new Date().toISOString(),
        });

        // Tag the extra credit txs so a second scan skips them
        for (const txId of g.txIds) {
          await updateDoc(doc(db, "transactions", txId), {
            reversedDuplicate: true,
            reversedAt: new Date().toISOString(),
            reversedBy: appUser!.uid,
          });
        }
        ok++;
      } catch (err) {
        console.error(`[refund-repair] reversal failed for ${g.orderId}:`, err);
        fail++;
      }
    }
    setReversedCount(ok);
    setReversing(false);
    toast.success(`Reversed ${ok} order${ok === 1 ? "" : "s"}${fail ? ` · ${fail} failed` : ""}`);
    // Re-scan
    await scan();
  }

  if (!isAdmin) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Admin only.
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalExtra = groups.reduce((s, g) => s + g.extraTotal, 0);

  return (
    <div className="container py-6 space-y-6 max-w-4xl">
      <div>
        <Link to="/admin" className="text-sm text-muted-foreground hover:underline">← Admin</Link>
        <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
          PAN — Duplicate Refund Repair
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scans <code>transactions</code> for UTI coupon orders that received the same
          refund twice (legacy bug, now fixed). Reverses the extra credit by debiting the wallet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1 — Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={scan} disabled={scanning}>
            {scanning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning…</> : "Scan transactions"}
          </Button>
        </CardContent>
      </Card>

      {scanned && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Step 2 — Review & Reverse</span>
              {groups.length > 0 && (
                <Badge variant="destructive">₹{totalExtra} extra across {groups.length} order(s)</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groups.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                No duplicate refunds found. Wallets are clean.
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Order ID</th>
                        <th className="text-left p-2">Retailer UID</th>
                        <th className="text-right p-2">Per-credit</th>
                        <th className="text-right p-2">Extra credits</th>
                        <th className="text-right p-2">To debit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <tr key={g.orderId} className="border-t">
                          <td className="p-2 font-mono text-xs">{g.orderId}</td>
                          <td className="p-2 font-mono text-xs">{g.userId.slice(0, 12)}…</td>
                          <td className="p-2 text-right">₹{g.amount}</td>
                          <td className="p-2 text-right">×{g.extraCredits}</td>
                          <td className="p-2 text-right font-semibold text-red-600">−₹{g.extraTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    Reversal is irreversible. If a retailer's current balance is less than
                    the extra credit, their wallet will go negative — please inform them.
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={reverseAll}
                  disabled={reversing}
                >
                  {reversing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reversing…</> : `Reverse ₹${totalExtra} from ${groups.length} wallet(s)`}
                </Button>
              </>
            )}
            {reversedCount > 0 && (
              <div className="text-sm text-emerald-700">Last run: reversed {reversedCount} order(s).</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
