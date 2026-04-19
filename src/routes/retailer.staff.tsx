import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, Power, PowerOff, Trash2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  subscribeStaff, createRetailerStaff, setStaffActive, updateStaffRole,
  type RetailerStaff, type RetailerStaffRole,
} from "@/lib/retailer-staff";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export const Route = createFileRoute("/retailer/staff")({
  ssr: false,
  component: RetailerStaffPage,
});

function RetailerStaffPage() {
  const { appUser } = useAuth();
  const [staff, setStaff] = useState<RetailerStaff[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RetailerStaffRole>("staff");
  const [loading, setLoading] = useState(false);
  const [retailerPwd, setRetailerPwd] = useState("");

  useEffect(() => {
    if (!appUser) return;
    return subscribeStaff(appUser.uid, setStaff);
  }, [appUser]);

  if (!appUser) return null;

  const handleAdd = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      return toast.error("Fill name, email, and a 6+ char password");
    }
    if (!retailerPwd) {
      return toast.error("Enter your own password — required to switch back after creating staff");
    }
    setLoading(true);
    const myEmail = appUser.email;
    try {
      await createRetailerStaff({
        parentRetailerId: appUser.uid,
        name, email, password, phone, role,
      });
      // Switch back to retailer account
      await signInWithEmailAndPassword(auth, myEmail, retailerPwd);
      toast.success(`Staff created: ${name}`);
      setOpen(false);
      setName(""); setEmail(""); setPhone(""); setPassword(""); setRole("staff"); setRetailerPwd("");
    } catch (e: any) {
      toast.error(e.message || "Failed to create staff");
      // Try to recover retailer session
      if (retailerPwd) {
        await signInWithEmailAndPassword(auth, myEmail, retailerPwd).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Staff Management</h1>
          <p className="text-muted-foreground text-sm">Add staff &amp; operators under your retailer account.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gov-blue text-white">
          <UserPlus className="w-4 h-4 mr-2" /> Add Staff
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Staff List ({staff.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No staff added yet.</td></tr>
                ) : staff.map((s) => (
                  <tr key={s.uid} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-muted-foreground">{s.email}</td>
                    <td className="p-3">
                      <Select value={s.role} onValueChange={async (v) => {
                        await updateStaffRole(appUser.uid, s.uid, v as RetailerStaffRole);
                        toast.success("Role updated");
                      }}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Badge variant={s.active ? "default" : "secondary"}>{s.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={async () => {
                          await setStaffActive(appUser.uid, s.uid, !s.active);
                          toast.success(s.active ? "Deactivated" : "Activated");
                        }}
                      >
                        {s.active ? <PowerOff className="w-3 h-3 mr-1" /> : <Power className="w-3 h-3 mr-1" />}
                        {s.active ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-4 text-xs text-muted-foreground flex gap-2">
          <Shield className="w-4 h-4 shrink-0 mt-0.5 text-gov-blue" />
          <p>
            <b>Operator role:</b> Operators get a separate dashboard at <code>/operator</code> with a limited view.
            <b> Staff role:</b> Staff log into the retailer dashboard with limited menu access. Both share your wallet and VLE ID.
          </p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email (login)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Initial Password (6+ chars)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as RetailerStaffRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff (limited retailer dashboard)</SelectItem>
                  <SelectItem value="operator">Operator (separate dashboard)</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3">
              <Label className="text-amber-700">Your Password (to switch back)</Label>
              <Input type="password" value={retailerPwd} onChange={(e) => setRetailerPwd(e.target.value)}
                placeholder="Required — we sign you back in after creating staff" />
              <p className="text-xs text-muted-foreground mt-1">
                Creating a staff temporarily signs you out. Enter your password so we can sign you back in automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading}>{loading ? "Creating..." : "Create Staff"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
