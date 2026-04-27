import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Users as UsersIcon, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/staff-created-users")({
  ssr: false,
  component: AdminStaffCreatedUsers,
});

interface UserRow {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
  createdByStaffId?: string;
  createdByStaffName?: string;
  createdByStaffEmail?: string;
}

interface StaffAggregate {
  staffId: string;
  staffName: string;
  staffEmail: string;
  total: number;
  byRole: Record<string, number>;
  users: UserRow[];
}

function AdminStaffCreatedUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<StaffAggregate | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        const all: UserRow[] = [];
        snap.forEach((d) => all.push({ id: d.id, ...(d.data() as any) }));
        setUsers(all.filter((u) => !!u.createdByStaffId));
        setStaffMembers(
          all.filter((u) => u.role === "staff" || u.role === "manager"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const aggregates: StaffAggregate[] = useMemo(() => {
    const map = new Map<string, StaffAggregate>();

    // Seed with all known staff so people with 0 created users still appear
    for (const s of staffMembers) {
      map.set(s.id, {
        staffId: s.id,
        staffName: s.name || s.email || "—",
        staffEmail: s.email || "",
        total: 0,
        byRole: {},
        users: [],
      });
    }

    for (const u of users) {
      const sid = u.createdByStaffId!;
      let agg = map.get(sid);
      if (!agg) {
        agg = {
          staffId: sid,
          staffName: u.createdByStaffName || "Unknown staff",
          staffEmail: u.createdByStaffEmail || "",
          total: 0,
          byRole: {},
          users: [],
        };
        map.set(sid, agg);
      }
      agg.total += 1;
      const role = u.role || "unknown";
      agg.byRole[role] = (agg.byRole[role] || 0) + 1;
      agg.users.push(u);
    }

    const list = Array.from(map.values());
    list.sort((a, b) => b.total - a.total);
    return list;
  }, [users, staffMembers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return aggregates;
    return aggregates.filter(
      (a) =>
        a.staffName.toLowerCase().includes(q) ||
        a.staffEmail.toLowerCase().includes(q),
    );
  }, [aggregates, search]);

  const totalCreated = users.length;
  const activeStaff = aggregates.filter((a) => a.total > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Users Created by Staff
        </h1>
        <p className="text-muted-foreground">
          Track how many users each staff member has registered on the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total users created by staff</p>
            <p className="text-2xl font-bold">{totalCreated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active staff (≥1 user)</p>
            <p className="text-2xl font-bold">{activeStaff}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total staff members</p>
            <p className="text-2xl font-bold">{staffMembers.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Per-Staff Breakdown</CardTitle>
              <CardDescription>
                Click "View" to see exactly which users a staff member created.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff name / email..."
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Staff
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Total Created
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Breakdown
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No staff records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr
                      key={a.staffId}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {a.staffName}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {a.staffEmail || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={a.total > 0 ? "default" : "secondary"}
                          className="gap-1"
                        >
                          <UsersIcon className="w-3 h-3" />
                          {a.total}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(a.byRole).length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            Object.entries(a.byRole).map(([role, n]) => (
                              <Badge
                                key={role}
                                variant="outline"
                                className="capitalize text-xs"
                              >
                                {role}: {n}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={a.total === 0}
                          onClick={() => setDetail(a)}
                        >
                          <Eye className="w-3 h-3" /> View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Users created by {detail?.staffName}
            </DialogTitle>
            <DialogDescription>
              {detail?.total} user(s) registered by this staff member.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.users
                    .slice()
                    .sort((a, b) =>
                      (b.createdAt || "").localeCompare(a.createdAt || ""),
                    )
                    .map((u) => (
                      <tr key={u.id} className="border-b border-border/50">
                        <td className="py-2 px-3">{u.name || "—"}</td>
                        <td className="py-2 px-3">{u.email}</td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="capitalize">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
