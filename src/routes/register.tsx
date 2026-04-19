import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { resolveReferralCode, attachReferralToUser } from "@/lib/referral-firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  ssr: false,
  component: RegisterPage,
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Register — EI Solutions CSC Platform" },
      { name: "description", content: "Create a new retailer account on EI Solutions Janasevana Kendram CSC Platform." },
    ],
  }),
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/register" });
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    shopName: "", address: "", referralCode: "",
  });
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill referral code from ?ref=
  useEffect(() => {
    if (search.ref) {
      setForm((f) => ({ ...f, referralCode: search.ref!.toUpperCase() }));
    }
  }, [search.ref]);

  // Resolve referrer name for display
  useEffect(() => {
    const code = form.referralCode.trim().toUpperCase();
    if (!code) { setReferrerName(null); return; }
    let cancelled = false;
    resolveReferralCode(code).then(async (uid) => {
      if (cancelled || !uid) { setReferrerName(uid ? "Valid referrer" : null); return; }
      const { getDoc, doc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const snap = await getDoc(doc(db, "users", uid));
      if (!cancelled) setReferrerName(snap.exists() ? (snap.data().name || "Valid referrer") : null);
    });
    return () => { cancelled = true; };
  }, [form.referralCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      // Resolve referrer first (so we don't create user with bogus code reference)
      let referrerUid: string | null = null;
      if (form.referralCode.trim()) {
        referrerUid = await resolveReferralCode(form.referralCode);
        if (!referrerUid) {
          setError("Invalid referral code.");
          setLoading(false);
          return;
        }
      }
      await register(form.email, form.password, {
        name: form.name,
        phone: form.phone,
        role: "retailer",
      });
      // Attach referral after user doc exists
      if (referrerUid) {
        const { auth } = await import("@/lib/firebase");
        const newUid = auth.currentUser?.uid;
        if (newUid) await attachReferralToUser(newUid, referrerUid);
      }
      toast.success("Account created! Activate your account to unlock services.");
      navigate({ to: "/retailer/activate" as any });
    } catch (err: any) {
      const msg = err?.code === "auth/email-already-in-use"
        ? "This email is already registered."
        : err?.message || "Registration failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join EI Solutions CSC Platform as a Retailer</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Retailer Registration</CardTitle>
            <CardDescription>Fill in your details to create a new account.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
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
                <Label>Shop Name</Label>
                <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <UserPlus className="w-4 h-4 mr-2" />
                {loading ? "Creating Account..." : "Register"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/" className="text-sm text-accent hover:underline">
                Already have an account? Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
