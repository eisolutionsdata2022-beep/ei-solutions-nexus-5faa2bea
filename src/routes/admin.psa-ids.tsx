import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Award, Search, Users, Ticket } from "lucide-react";
import type { PsaIdRecord } from "@/lib/psa-auto-id";

export const Route = createFileRoute("/admin/psa-ids")({
  ssr: false,
  component: AdminPsaIds,
});

interface Row {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  couponCount: number;
  psa: PsaIdRecord | null;
}

function AdminPsaIds() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1. Pull all retailers/users
        const usersSnap = await getDocs(collection(db, "users"));
        // 2. Pull all generated PSA IDs (keyed by uid)
        const psaSnap = await getDocs(collection(db, "psa_ids"));
        const psaByUid = new Map<string, PsaIdRecord>();
        psaSnap.forEach((d) => {
          const data = d.data() as PsaIdRecord;
          psaByUid.set(data.uid || d.id, data);
        });

        // 3. For each user, count successful coupon-buy transactions
        const list: Row[] = [];
        await Promise.all(
          usersSnap.docs.map(async (u) => {
            const data = u.data() as Record<string, unknown>;
            const role = (data.role as string) || "";
            // Only show retailers / staff sub-accounts (anyone who can buy coupons)
            if (role && !["retailer", "staffSub", "operator"].includes(role)) return;
            const couponSnap = await getDocs(
              query(
                collection(db, "pan_transactions"),
                where("retailerId", "==", u.id),
                where("serviceKey", "==", "coupon-buy"),
                where("status", "==", "success"),
              ),
            );
            list.push({
              uid: u.id,
              name: (data.name as string) || (data.email as string) || "—",
              email: (data.email as string) || "",
              phone: (data.phone as string) || (data.mobile as string) || "",
              couponCount: couponSnap.size,
              psa: psaByUid.get(u.id) ?? null,
            });
          }),
        );
        list.sort((a, b) => b.couponCount - a.couponCount);
        setRows(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        (r.psa?.psaId || "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    const generated = rows.filter((r) => !!r.psa).length;
    const totalCoupons = rows.reduce((s, r) => s + r.couponCount, 0);
    return { generated, totalCoupons, users: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Award className="h-6 w-6" /> PSA ID Monitor
        </h1>
        <p className="text-sm text-muted-foreground">
          Auto-generated PSA IDs (issued after a user successfully purchases 2 coupons).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Eligible users</p>
              <p className="text-2xl font-bold">{totals.users}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Ticket className="h-8 w-8 text-fuchsia-500" />
            <div>
              <p className="text-xs text-muted-foreground">Successful coupons</p>
              <p className="text-2xl font-bold">{totals.totalCoupons}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Award className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">PSA IDs generated</p>
              <p className="text-2xl font-bold">{totals.generated}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Users & PSA Status</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, mobile, PSA ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-center">Coupons (Success)</TableHead>
                  <TableHead>PSA ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No users match.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.uid}>
                      <TableCell>
                        <div className="font-medium text-foreground">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.phone || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={r.couponCount >= 2 ? "default" : "secondary"}>
                          {r.couponCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {r.psa ? r.psa.psaId : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {r.psa ? (
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-emerald-600">ACTIVE</Badge>
                            <Badge variant="outline" className="text-[10px] py-0 capitalize w-fit">
                              {r.psa.source === "legacy" ? "Migrated" : r.psa.source === "provider" ? "Provider" : "Auto"}
                            </Badge>
                          </div>
                        ) : r.couponCount >= 2 ? (
                          <Badge variant="secondary">Pending sync</Badge>
                        ) : (
                          <Badge variant="outline">Not eligible</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.psa
                          ? new Date(r.psa.generatedAt).toLocaleString("en-IN")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
