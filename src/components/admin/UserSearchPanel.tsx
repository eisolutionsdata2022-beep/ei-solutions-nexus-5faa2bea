import { useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, UserCog, ShieldCheck, ShieldX, Wallet, Settings,
  Pencil, Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface UserResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  kycStatus: string;
  status: string;
  distributorId?: string;
}

export function UserSearchPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<UserResult | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "", kycStatus: "" });
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) { toast.error("Please enter a search term"); return; }
    setSearching(true);
    setSearched(true);
    try {
      // Fetch all users and filter client-side (Firebase doesn't support OR queries across fields easily)
      const snap = await getDocs(collection(db, "users"));
      const all: UserResult[] = [];
      snap.forEach((d) => all.push({ id: d.id, ...d.data() } as UserResult));

      const lowerQ = q.toLowerCase();
      const filtered = all.filter((u) =>
        u.email?.toLowerCase().includes(lowerQ) ||
        u.phone?.includes(q) ||
        u.name?.toLowerCase().includes(lowerQ)
      );
      setResults(filtered);
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const openEdit = (u: UserResult) => {
    setEditUser(u);
    setEditForm({
      name: u.name || "",
      phone: u.phone || "",
      role: u.role || "retailer",
      kycStatus: u.kycStatus || "pending",
    });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", editUser.id), {
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
        kycStatus: editForm.kycStatus,
      });
      toast.success("User updated!");
      setEditUser(null);
      // Refresh results
      setResults((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? { ...u, name: editForm.name, phone: editForm.phone, role: editForm.role, kycStatus: editForm.kycStatus }
            : u
        )
      );
    } catch {
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (u: UserResult) => {
    const newStatus = u.status === "blocked" ? "active" : "blocked";
    try {
      await updateDoc(doc(db, "users", u.id), { status: newStatus });
      toast.success(newStatus === "blocked" ? "User blocked!" : "User unblocked!");
      setResults((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status: newStatus } : x))
      );
    } catch {
      toast.error("Action failed");
    }
  };

  const approveKyc = async (u: UserResult) => {
    try {
      await updateDoc(doc(db, "users", u.id), { kycStatus: "approved" });
      toast.success("KYC approved!");
      setResults((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, kycStatus: "approved" } : x))
      );
    } catch {
      toast.error("Failed");
    }
  };

  const viewWallet = async (u: UserResult) => {
    try {
      const snap = await getDoc(doc(db, "wallets", u.id));
      const balance = snap.exists() ? snap.data().balance || 0 : 0;
      toast.info(`${u.name || u.email} — Wallet Balance: ₹${balance.toFixed(2)}`);
    } catch {
      toast.error("Could not fetch wallet");
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="bg-gov-blue-light border-b border-border px-5 py-3">
        <h2 className="text-base font-bold text-gov-blue flex items-center gap-2">
          <Search className="w-4 h-4" /> Quick User Search
        </h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by mobile, email, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching} className="bg-gov-blue hover:opacity-90 text-white">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {searched && results.length === 0 && !searching && (
          <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            No users found matching your search.
          </div>
        )}

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gov-blue">Name</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gov-blue">Email / Phone</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gov-blue">Role</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gov-blue">KYC</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gov-blue">Status</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gov-blue">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="px-3 py-2 font-medium">{u.name || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="text-xs">{u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.phone || "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[10px] capitalize">{u.role}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={u.kycStatus === "approved" ? "default" : u.kycStatus === "rejected" ? "destructive" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {u.kycStatus || "N/A"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={u.status === "blocked" ? "destructive" : "default"}
                        className="text-[10px] capitalize"
                      >
                        {u.status || "active"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openEdit(u)}>
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        {u.kycStatus !== "approved" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-success" onClick={() => approveKyc(u)}>
                            <ShieldCheck className="w-3 h-3" /> Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 text-xs gap-1 ${u.status === "blocked" ? "text-success" : "text-destructive"}`}
                          onClick={() => toggleBlock(u)}
                        >
                          <ShieldX className="w-3 h-3" />
                          {u.status === "blocked" ? "Unblock" : "Block"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => viewWallet(u)}>
                          <Wallet className="w-3 h-3" /> Wallet
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(v) => { if (!v) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" /> Edit User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KYC Status</Label>
              <Select value={editForm.kycStatus} onValueChange={(v) => setEditForm((p) => ({ ...p, kycStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
