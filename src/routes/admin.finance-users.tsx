import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, UserPlus, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  adminCreateFinanceUser,
  adminSetFinanceUserActive,
  adminUpdateFinanceUser,
  subscribeFinanceUsers,
  type FinanceUserProfile,
} from "@/lib/finance-auth";

export const Route = createFileRoute("/admin/finance-users")({
  ssr: false,
  component: AdminFinanceUsers,
});

function AdminFinanceUsers() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<FinanceUserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceUserProfile | null>(null);

  useEffect(() => {
    return subscribeFinanceUsers(setUsers);
  }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.displayName || "").toLowerCase().includes(q)
    );
  });

  const toggleActive = async (u: FinanceUserProfile) => {
    try {
      await adminSetFinanceUserActive(u.uid, !u.active);
      toast.success(`${u.username} ${u.active ? "deactivated" : "activated"}.`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Finance Portal Users
          </h1>
          <p className="text-muted-foreground">
            Manage standalone Finance subsite accounts. These users can ONLY access /finance and have no retailer privileges.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Finance User
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username or name…"
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Finance users — {users.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Display Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {users.length === 0
                        ? "No Finance users yet. Click 'Create Finance User' to add one."
                        : "No matches."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.uid} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                      <td className="px-4 py-3">{u.displayName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.active}
                            onCheckedChange={() => toggleActive(u)}
                          />
                          <Badge variant={u.active ? "default" : "secondary"}>
                            {u.active ? "Active" : "Revoked"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                          Edit
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

      <CreateFinanceUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        createdBy={appUser?.email || appUser?.uid || "admin"}
      />

      {editing && (
        <EditFinanceUserDialog
          user={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CreateFinanceUserDialog({
  open,
  onClose,
  createdBy,
}: {
  open: boolean;
  onClose: () => void;
  createdBy: string;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setUsername(""); setDisplayName(""); setPassword(""); setNotes(""); setShowPwd(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminCreateFinanceUser({
        username,
        displayName,
        password,
        createdBy,
        notes,
      });
      toast.success(`Finance user "${username}" created.`);
      reset();
      onClose();
    } catch (err: any) {
      const msg = String(err?.code || err?.message || "");
      if (msg.includes("email-already-in-use")) {
        toast.error("That username already exists.");
      } else {
        toast.error(err?.message || "Failed to create user.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Finance User</DialogTitle>
          <DialogDescription>
            This account will have access to the /finance subsite ONLY. No retailer privileges.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fu-username">Username *</Label>
            <Input
              id="fu-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. branch_kochi"
              pattern="[a-z0-9_.\-]{3,32}"
              title="3–32 chars: a–z, 0–9, . _ -"
              required
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Lowercase letters, numbers, dot/underscore/dash. 3–32 chars.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-name">Display name *</Label>
            <Input
              id="fu-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Kochi Branch — Mr. Suresh"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-pwd">Password *</Label>
            <div className="relative">
              <Input
                id="fu-pwd"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Toggle password visibility"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Minimum 8 characters. Share securely with the user.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-notes">Notes (optional)</Label>
            <Textarea
              id="fu-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — branch, contact, etc."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { reset(); onClose(); }} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditFinanceUserDialog({
  user,
  onClose,
}: {
  user: FinanceUserProfile;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [notes, setNotes] = useState(user.notes || "");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminUpdateFinanceUser(user.uid, { displayName, notes });
      toast.success("Updated.");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.username}</DialogTitle>
          <DialogDescription>
            Username and password cannot be changed here. To reset password, deactivate and create a new account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
