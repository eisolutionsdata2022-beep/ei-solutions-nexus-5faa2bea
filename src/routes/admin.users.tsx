import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Eye, Search, UserCog, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UserServicePermissionsDialog } from "@/components/admin/UserServicePermissionsDialog";
import { getEditHistory, getRecentLogins, type UserEditLog } from "@/lib/profile-edits";
import { getStaffCounts } from "@/lib/retailer-staff";
import { deleteUserCompletely } from "@/lib/user-deletion";
import { useAuth, type UserRole } from "@/lib/auth-context";

const ASSIGNABLE_ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: "retailer", label: "Retailer", hint: "Franchise partner / shop owner" },
  { value: "trainer", label: "Trainer", hint: "Conducts training sessions, earns per session" },
  { value: "staff", label: "Staff", hint: "Internal staff — CRM, services, support" },
  { value: "manager", label: "Manager", hint: "Internal manager — staff-level access + reports" },
  { value: "distributor", label: "Distributor", hint: "Earns override commissions on retailers" },
  { value: "admin", label: "Admin", hint: "⚠️ Full platform access — use with care" },
];

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [permUser, setPermUser] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [history, setHistory] = useState<UserEditLog[]>([]);
  const [logins, setLogins] = useState<{ id: string; timestamp: string }[]>([]);
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [roleUser, setRoleUser] = useState<any | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("retailer");
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setUsers(list);
      setStaffCounts(await getStaffCounts());
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) =>
      !q ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const openDetail = async (u: any) => {
    setDetail(u);
    setHistory(await getEditHistory(u.id).catch(() => []));
    setLogins(await getRecentLogins(u.id, 20).catch(() => []));
  };

  const openRoleChange = (u: any) => {
    setRoleUser(u);
    setNewRole((u.role as UserRole) || "retailer");
  };

  const saveRole = async () => {
    if (!roleUser) return;
    if (newRole === roleUser.role) {
      toast.info("Role unchanged");
      return;
    }
    if (roleUser.role === "operator" || roleUser.role === "staffSub") {
      toast.error("Sub-accounts (operator / staffSub) must be managed from the parent retailer's staff page.");
      return;
    }
    setSavingRole(true);
    try {
      await updateDoc(doc(db, "users", roleUser.id), {
        role: newRole,
        roleUpdatedAt: new Date().toISOString(),
      });
      setUsers((prev) => prev.map((x) => (x.id === roleUser.id ? { ...x, role: newRole } : x)));
      toast.success(`Role updated to ${newRole}`);
      setRoleUser(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update role");
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground">All registered platform users — {users.length} total.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, role..." className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">KYC</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Staff</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created By</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Login</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 text-foreground">{u.name || "—"}</td>
                    <td className="py-3 px-4 text-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        u.kycStatus === "approved" ? "default" :
                        u.kycStatus === "rejected" ? "destructive" : "secondary"
                      } className="capitalize">
                        {u.kycStatus || "N/A"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{staffCounts[u.id] || 0}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {u.createdByStaffName ? (
                        <span title={u.createdByStaffEmail || ""}>{u.createdByStaffName}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openDetail(u)}>
                          <Eye className="w-3 h-3" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => openRoleChange(u)}
                          disabled={u.role === "operator" || u.role === "staffSub"}
                          title={u.role === "operator" || u.role === "staffSub" ? "Sub-accounts managed via parent retailer" : "Change user role"}
                        >
                          <UserCog className="w-3 h-3" /> Role
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => setPermUser({ id: u.id, name: u.name, email: u.email })}
                        >
                          <ShieldCheck className="w-3 h-3" /> Services
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {permUser && (
        <UserServicePermissionsDialog
          open={!!permUser}
          onClose={() => setPermUser(null)}
          user={permUser}
        />
      )}

      <Dialog open={!!roleUser} onOpenChange={(o) => !o && setRoleUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" /> Change Role
            </DialogTitle>
            <DialogDescription>
              Upgrade or reassign <b>{roleUser?.name || roleUser?.email}</b> to a different role. The user will see the new dashboard on their next login (or page refresh).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-sm">
              <p className="text-muted-foreground">Current role</p>
              <Badge variant="secondary" className="capitalize mt-1">{roleUser?.role}</Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-muted-foreground">{r.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newRole === "admin" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                ⚠️ Admin role grants full platform access including user management, payouts, and settings. Only assign to trusted personnel.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleUser(null)} disabled={savingRole}>
              Cancel
            </Button>
            <Button onClick={saveRole} disabled={savingRole || newRole === roleUser?.role}>
              {savingRole ? "Saving..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.name || detail?.email}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" value={detail.email} />
                <Field label="Phone" value={detail.phone} />
                <Field label="Role" value={detail.role} />
                <Field label="KYC Status" value={detail.kycStatus || "pending"} />
                <Field label="Joined" value={detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "—"} />
                <Field label="Last Login" value={detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : "—"} />
                <Field label="Staff Added" value={String(staffCounts[detail.id] || 0)} />
                <Field label="Address" value={detail.address || "—"} />
              </div>

              <section>
                <h3 className="font-bold mb-2">Recent Logins ({logins.length})</h3>
                <div className="border rounded max-h-40 overflow-y-auto">
                  {logins.length === 0 ? (
                    <p className="p-3 text-muted-foreground text-xs">No login records.</p>
                  ) : logins.map((l) => (
                    <div key={l.id} className="px-3 py-1.5 text-xs border-b last:border-0">
                      {new Date(l.timestamp).toLocaleString()}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-bold mb-2">Edit History ({history.length})</h3>
                <div className="border rounded max-h-40 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="p-3 text-muted-foreground text-xs">No edits yet.</p>
                  ) : history.map((h) => (
                    <div key={h.id} className="px-3 py-1.5 text-xs border-b last:border-0">
                      <b className="capitalize">{h.field}</b>: {String(h.oldValue || "—").slice(0, 40)} → {String(h.newValue || "—").slice(0, 40)}
                      <span className="text-muted-foreground ml-2">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
