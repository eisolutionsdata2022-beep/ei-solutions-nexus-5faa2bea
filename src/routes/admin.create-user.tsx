import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/create-user")({
  component: AdminCreateUser,
});

function AdminCreateUser() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", role: "retailer",
  });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);

      const now = new Date().toISOString();

      // Save user profile in Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        kycStatus: "pending",
        createdAt: now,
      });

      // Create wallet automatically
      await setDoc(doc(db, "wallets", cred.user.uid), {
        userId: cred.user.uid,
        balance: 0,
        createdAt: now,
      });

      toast.success(`${form.role} account created successfully!`);
      setCreated(true);
    } catch (err: any) {
      const msg = err?.code === "auth/email-already-in-use"
        ? "Email already in use."
        : err?.message || "Failed to create user.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">User Created!</h2>
            <p className="text-muted-foreground mb-1">{form.name} ({form.email})</p>
            <p className="text-sm text-muted-foreground capitalize">Role: {form.role}</p>
            <Button className="mt-6" onClick={() => {
              setCreated(false);
              setForm({ name: "", email: "", phone: "", password: "", role: "retailer" });
            }}>
              Create Another User
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create User</h1>
        <p className="text-muted-foreground">Create new platform users with auto wallet setup.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>Fill in all fields to create a new user account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? "Creating..." : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
