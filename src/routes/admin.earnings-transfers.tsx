import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  subscribeEarningsTransferRequests,
  approveEarningsTransfer,
  rejectEarningsTransfer,
  type EarningsTransferRequest,
} from "@/lib/worker-earnings";
import { toast } from "sonner";
import { CheckCircle, XCircle, Wallet, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/earnings-transfers")({
  ssr: false,
  component: AdminEarningsTransfers,
});

function AdminEarningsTransfers() {
  const { appUser } = useAuth();
  const [reqs, setReqs] = useState<EarningsTransferRequest[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    const unsub = subscribeEarningsTransferRequests(setReqs);
    return unsub;
  }, []);

  const filtered = reqs.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = reqs.filter((r) => r.status === "pending").length;

  const handle = async (r: EarningsTransferRequest, action: "approve" | "reject") => {
    if (!appUser) return;
    setBusy(r.id);
    try {
      const note = remarks[r.id] || "";
      if (action === "approve") {
        await approveEarningsTransfer(r.id, appUser.uid, note);
        toast.success(`₹${r.amount} transferred to ${r.userName}'s wallet`);
      } else {
        await rejectEarningsTransfer(r.id, appUser.uid, note);
        toast.success("Request rejected");
      }
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Wallet className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Job Earnings Transfer Requests</h1>
        <Badge variant="secondary">{pendingCount} pending</Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No {filter === "all" ? "" : filter} requests.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {r.userName} — ₹{r.amount.toFixed(2)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {r.userEmail} • {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      r.status === "approved"
                        ? "default"
                        : r.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {r.status === "pending" && (
                  <>
                    <div>
                      <Label className="text-xs">Remarks (optional)</Label>
                      <Input
                        value={remarks[r.id] || ""}
                        onChange={(e) => setRemarks({ ...remarks, [r.id]: e.target.value })}
                        placeholder="Note for the worker..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handle(r, "approve")}
                        disabled={busy === r.id}
                      >
                        {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Approve & Transfer</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handle(r, "reject")}
                        disabled={busy === r.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </>
                )}
                {r.status !== "pending" && r.remarks && (
                  <p className="text-xs text-muted-foreground">Remarks: {r.remarks}</p>
                )}
                {r.processedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Processed: {new Date(r.processedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
