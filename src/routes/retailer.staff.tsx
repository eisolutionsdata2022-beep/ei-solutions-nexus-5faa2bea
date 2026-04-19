import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, Power, PowerOff, Users, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  subscribeStaff, createRetailerStaff, setStaffActive,
  type RetailerStaff,
} from "@/lib/retailer-staff";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

const MAX_OPERATORS = 2;

export const Route = createFileRoute("/retailer/staff")({
  ssr: false,
  component: RetailerOperatorsPage,
});

function RetailerOperatorsPage() {
  const { appUser } = useAuth();
  const [operators, setOperators] = useState<RetailerStaff[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [retailerPwd, setRetailerPwd] = useState("");

  useEffect(() => {
    if (!appUser) return;
    return subscribeStaff(appUser.uid, (list) => {
      // Show only operators (legacy staff/manager hidden)
      setOperators(list.filter((s) => s.role === "operator"));
    });
  }, [appUser]);

  if (!appUser) return null;

  const atLimit = operators.length >= MAX_OPERATORS;

  const handleAdd = async () => {
    if (atLimit) return toast.error(`Maximum ${MAX_OPERATORS} operators allowed`);
    if (!name.trim() || !email.trim() || password.length < 6) {
      return toast.error("Fill name, email, and a 6+ char password");
    }
    if (!retailerPwd) {
      return toast.error("Enter your own password — required to switch back after creating operator");
    }
    setLoading(true);
    const myEmail = appUser.email;
    try {
      await createRetailerStaff({
        parentRetailerId: appUser.uid,
        name, email, password, phone, role: "operator",
      });
      await signInWithEmailAndPassword(auth, myEmail, retailerPwd);
      toast.success(`Operator created: ${name}`);
      setOpen(false);
      setName(""); setEmail(""); setPhone(""); setPassword(""); setRetailerPwd("");
    } catch (e: any) {
      toast.error(e.message || "Failed to create operator");
      if (retailerPwd) {
        await signInWithEmailAndPassword(auth, myEmail, retailerPwd).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Operators
          </h1>
          <p className="text-muted-foreground text-sm">
            Add up to <b>{MAX_OPERATORS} operators</b> to help run your retail counter.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={atLimit}
          className="bg-gov-blue text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Operator {atLimit ? "(Limit Reached)" : `(${operators.length}/${MAX_OPERATORS})`}
        </Button>
      </div>

      {atLimit && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 flex gap-2 text-sm text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>You've reached the maximum of {MAX_OPERATORS} operators. Deactivate one to add another.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Operators ({operators.length}/{MAX_OPERATORS})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {operators.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No operators added yet.</td></tr>
                ) : operators.map((s) => (
                  <tr key={s.uid} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-muted-foreground">{s.email}</td>
                    <td className="p-3 text-muted-foreground">{s.phone || "—"}</td>
                    <td className="p-3">
                      <Badge variant={s.active ? "default" : "secondary"}>
                        {s.active ? "Active" : "Inactive"}
                      </Badge>
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
            <b>Operators</b> get their own login and a dedicated dashboard at <code>/operator</code>.
            They share your wallet, VLE ID, and PSA ID. Use this to let assistants help process customer requests at your counter.
          </p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Operator</DialogTitle></DialogHeader>
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
            <div className="border-t pt-3">
              <Label className="text-amber-700">Your Password (to switch back)</Label>
              <Input type="password" value={retailerPwd} onChange={(e) => setRetailerPwd(e.target.value)}
                placeholder="Required — we sign you back in after creating operator" />
              <p className="text-xs text-muted-foreground mt-1">
                Creating an operator temporarily signs you out. Enter your password so we can sign you back in automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading || atLimit}>
              {loading ? "Creating..." : "Create Operator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
