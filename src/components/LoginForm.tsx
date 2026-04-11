import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Lock, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { PortalFooter } from "@/components/PortalFooter";

type TabType = "login" | "register";

export function LoginForm() {
  const { login, resetPassword, register } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [regForm, setRegForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const appUser = await login(email, password);
      navigate({ to: `/${appUser.role}` as any });
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (regForm.password.length < 6) {
      setRegError("Password must be at least 6 characters.");
      return;
    }
    setRegLoading(true);
    try {
      await register(regForm.email, regForm.password, {
        name: regForm.name,
        phone: regForm.phone,
        role: "retailer",
      });
      toast.success("Account created successfully!");
      navigate({ to: "/retailer" as any });
    } catch (err: any) {
      const msg = err?.code === "auth/email-already-in-use"
        ? "This email is already registered."
        : err?.message || "Registration failed.";
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gov-blue-light">
      {/* Header */}
      <header className="bg-gov-blue text-white py-6 px-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wide">EI SOLUTIONS Portal</h1>
        <p className="text-sm md:text-base opacity-80 mt-1">E-Governance &amp; Digital India Solutions</p>
      </header>

      {/* Tricolor strip */}
      <div className="flex h-2">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl">
          {/* Tab switcher */}
          <div className="flex mb-0">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-t-lg text-sm font-bold transition-colors ${
                activeTab === "login"
                  ? "bg-gov-blue text-white"
                  : "bg-white text-gov-blue border border-b-0 border-border"
              }`}
            >
              <User className="w-4 h-4" />
              + Login
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-t-lg text-sm font-bold transition-colors ${
                activeTab === "register"
                  ? "bg-gov-blue text-white"
                  : "bg-white text-gov-blue border border-b-0 border-border"
              }`}
            >
              <User className="w-4 h-4" />
              New User Registration
            </button>
          </div>

          {/* Form panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 bg-white rounded-b-xl shadow-lg border border-border overflow-hidden">
            {/* Login */}
            <div className={`p-6 ${activeTab === "login" ? "block" : "hidden md:block"} ${activeTab !== "login" ? "opacity-40 md:opacity-100" : ""}`}>
              <div className="bg-gov-blue-light border-l-4 border-gov-blue px-4 py-2 mb-5">
                <h2 className="font-bold text-sm text-gov-blue">Registered User Login</h2>
              </div>

              {error && (
                <div className="mb-3 p-2.5 rounded bg-red-50 text-destructive text-xs border border-red-200">{error}</div>
              )}
              {resetSent && (
                <div className="mb-3 p-2.5 rounded bg-green-50 text-success text-xs border border-green-200">
                  Password reset email sent!
                </div>
              )}

              {showReset ? (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/50" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="pl-10" required />
                  </div>
                  <Button type="submit" className="w-full bg-gov-gold hover:opacity-90 text-white font-bold">Send Reset Link</Button>
                  <button type="button" className="w-full text-sm text-gov-blue hover:underline" onClick={() => { setShowReset(false); setResetSent(false); }}>Back to Login</button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/50" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Username" className="pl-10" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/50" />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="pl-10" required />
                  </div>
                  <Button type="submit" className="w-full bg-gov-gold hover:opacity-90 text-white font-bold" disabled={loading}>
                    {loading ? "Signing in..." : "Login"}
                  </Button>
                  <button type="button" className="w-full text-sm text-gov-blue hover:underline" onClick={() => setShowReset(true)}>Forgot Password?</button>
                </form>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-border" />

            {/* Registration */}
            <div className={`p-6 border-t md:border-t-0 border-border ${activeTab === "register" ? "block" : "hidden md:block"} ${activeTab !== "register" ? "opacity-40 md:opacity-100" : ""}`}>
              <div className="bg-gov-blue-light border-l-4 border-gov-blue px-4 py-2 mb-5">
                <h2 className="font-bold text-sm text-gov-blue">New User Registration</h2>
              </div>

              {regError && (
                <div className="mb-3 p-2.5 rounded bg-red-50 text-destructive text-xs border border-red-200">{regError}</div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/50" />
                  <Input value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} placeholder="Full Name" className="pl-10" required />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/50" />
                  <Input type="tel" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} placeholder="Mobile Number" className="pl-10" required />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/50" />
                  <Input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} placeholder="Email Address" className="pl-10" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-blue/50" />
                  <Input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} placeholder="Choose Password" className="pl-10" required minLength={6} />
                </div>
                <Button type="submit" className="w-full bg-gov-green hover:opacity-90 text-white font-bold" disabled={regLoading}>
                  {regLoading ? "Creating Account..." : "Register"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">* A verification code will be sent to the registered mobile number</p>
              </form>
            </div>
          </div>
        </div>
      </div>

      <PortalFooter />
    </div>
  );
}
