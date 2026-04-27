import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle, Users as UsersIcon, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/create-user")({
  ssr: false,
  component: StaffCreateUser,
});

interface CreatedUserRow {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
}

function StaffCreateUser() {
  const { appUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "retailer",
  });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [myUsers, setMyUsers] = useState<CreatedUserRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");

  const loadMine = async () => {
    if (!appUser?.uid) return;
    setLoadingList(true);
    try {
      const q = query(
        collection(db, "users"),
        where("createdByStaffId", "==", appUser.uid),
      );
      const snap = await getDocs(q);
      const rows: CreatedUserRow[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
      rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setMyUsers(rows);
    } catch (e: any) {
      // swallow — list is best-effort
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.uid]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appUser?.uid) {
      toast.error("Not signed in.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      );
      const now = new Date().toISOString();

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        kycStatus: "pending",
        createdAt: now,
        // Attribution — used by admin to count users created per staff
        createdByStaffId: appUser.uid,
        createdByStaffName: appUser.name || appUser.email || "",
        createdByStaffEmail: appUser.email || "",
      });

      await setDoc(doc(db, "wallets", cred.user.uid), {
        userId: cred.user.uid,
        balance: 0,
        createdAt: now,
      });

      toast.success(`${form.role} account created successfully!`);
      setCreated(true);
      loadMine();
    } catch (err: any) {
      const msg =
        err?.code === "auth/email-already-in-use"
          ? "Email already in use."
          : err?.message || "Failed to create user.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return myUsers;
    return myUsers.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q),
    );
  }, [myUsers, search]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create User</h1>
          <p className="text-muted-foreground">
            Add new retailers (or other users) on behalf of EI SOLUTIONS.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 text-sm py-1.5 px-3">
          <UsersIcon className="w-4 h-4" />
          Created by you: <span className="font-bold">{myUsers.length}</span>
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New User Details</CardTitle>
          <CardDescription>
            Wallet is created automatically. The new user will be tagged as
            created by you for admin reporting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {created ? (
            <div className="text-center py-6">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-foreground mb-1">
                User Created!
              </h2>
              <p className="text-muted-foreground mb-1">
                {form.name} ({form.email})
              </p>
              <p className="text-sm text-muted-foreground capitalize mb-5">
                Role: {form.role}
              </p>
              <Button
                onClick={() => {
                  setCreated(false);
                  setForm({
                    name: "",
                    email: "",
                    phone: "",
                    password: "",
                    role: "retailer",
                  });
                }}
              >
                Create Another User
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="trainer">Trainer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {loading ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Users You Created</CardTitle>
              <CardDescription>
                Only the users you personally registered are shown here.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone..."
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
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Phone
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      You haven't created any users yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-3 px-4 text-foreground">
                        {u.name || "—"}
                      </td>
                      <td className="py-3 px-4 text-foreground">{u.email}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {u.phone || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
