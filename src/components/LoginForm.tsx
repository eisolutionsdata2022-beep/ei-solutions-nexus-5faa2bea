import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Lock, Mail, Phone, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type TabType = "login" | "register";

export function LoginForm() {
  const { login, resetPassword, register } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Register state
  const [regForm, setRegForm] = useState({
    name: "", phone: "", email: "", password: "",
  });
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
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #e8eef7 0%, #d4dff0 100%)" }}>
      {/* Header */}
      <header className="bg-[#1a3a6c] text-white py-5 px-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-wide">EI SOLUTIONS Portal</h1>
        <p className="text-sm md:text-base opacity-90 mt-1">E-Governance & Digital India Solutions</p>
      </header>

      {/* Tricolor stripe */}
      <div className="flex h-2">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl">
          {/* Tab switcher */}
          <div className="flex mb-0">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-t-xl text-sm font-semibold transition-colors border border-b-0 ${
                activeTab === "login"
                  ? "bg-white text-[#1a3a6c] border-[#c5d3e8]"
                  : "bg-[#1a3a6c]/10 text-[#1a3a6c]/70 border-transparent hover:bg-[#1a3a6c]/20"
              }`}
            >
              <User className="w-4 h-4" />
              Login
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-t-xl text-sm font-semibold transition-colors border border-b-0 ${
                activeTab === "register"
                  ? "bg-white text-[#1a3a6c] border-[#c5d3e8]"
                  : "bg-[#1a3a6c]/10 text-[#1a3a6c]/70 border-transparent hover:bg-[#1a3a6c]/20"
              }`}
            >
              <User className="w-4 h-4" />
              New User Registration
            </button>
          </div>

          {/* Forms container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-b-xl rounded-tr-xl shadow-lg border border-[#c5d3e8] overflow-hidden">
            {/* Login panel */}
            <div className={`p-6 ${activeTab === "login" ? "block" : "hidden md:block"} ${activeTab !== "login" ? "opacity-50 md:opacity-100" : ""}`}>
              <div className="bg-[#1a3a6c] text-white px-4 py-2 rounded-t-lg mb-4">
                <h2 className="font-semibold text-sm">Registered User Login</h2>
              </div>

              {error && (
                <div className="mb-3 p-2.5 rounded bg-red-50 text-red-600 text-xs border border-red-200">
                  {error}
                </div>
              )}
              {resetSent && (
                <div className="mb-3 p-2.5 rounded bg-green-50 text-green-600 text-xs border border-green-200">
                  Password reset email sent! Check your inbox.
                </div>
              )}

              {showReset ? (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6c]/50" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="pl-10 border-[#c5d3e8] focus:border-[#1a3a6c]"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#e8a838] hover:bg-[#d49530] text-white font-semibold">
                    Send Reset Link
                  </Button>
                  <button type="button" className="w-full text-sm text-[#1a3a6c] hover:underline" onClick={() => { setShowReset(false); setResetSent(false); }}>
                    Back to Login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6c]/50" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Username"
                      className="pl-10 border-[#c5d3e8] focus:border-[#1a3a6c]"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6c]/50" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="pl-10 border-[#c5d3e8] focus:border-[#1a3a6c]"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#e8a838] hover:bg-[#d49530] text-white font-semibold" disabled={loading}>
                    {loading ? "Signing in..." : "Login"}
                  </Button>
                  <button type="button" className="w-full text-sm text-[#1a3a6c] hover:underline" onClick={() => setShowReset(true)}>
                    Forgot Password?
                  </button>
                </form>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-[#c5d3e8]" />

            {/* Registration panel */}
            <div className={`p-6 border-t md:border-t-0 border-[#c5d3e8] ${activeTab === "register" ? "block" : "hidden md:block"} ${activeTab !== "register" ? "opacity-50 md:opacity-100" : ""}`}>
              <div className="bg-[#1a3a6c] text-white px-4 py-2 rounded-t-lg mb-4">
                <h2 className="font-semibold text-sm">New User Registration</h2>
              </div>

              {regError && (
                <div className="mb-3 p-2.5 rounded bg-red-50 text-red-600 text-xs border border-red-200">
                  {regError}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6c]/50" />
                  <Input
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    placeholder="Full Name"
                    className="pl-10 border-[#c5d3e8] focus:border-[#1a3a6c]"
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6c]/50" />
                  <Input
                    type="tel"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="Mobile Number"
                    className="pl-10 border-[#c5d3e8] focus:border-[#1a3a6c]"
                    required
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6c]/50" />
                  <Input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="Email Address"
                    className="pl-10 border-[#c5d3e8] focus:border-[#1a3a6c]"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a3a6c]/50" />
                  <Input
                    type="password"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Choose Password"
                    className="pl-10 border-[#c5d3e8] focus:border-[#1a3a6c]"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full bg-[#2e8b57] hover:bg-[#267a4c] text-white font-semibold" disabled={regLoading}>
                  {regLoading ? "Creating Account..." : "Register"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  * A verification code will be sent to the registered mobile number
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex h-1">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
      <footer className="bg-[#1a3a6c] text-white py-3 px-6 text-center text-sm">
        All Rights Reserved &bull; Contact Support : <span className="font-bold">1800-111-1111</span>
      </footer>
    </div>
  );
}
