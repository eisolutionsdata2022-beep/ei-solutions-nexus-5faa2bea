import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Mail, Lock, Phone, Eye, EyeOff, UserPlus, Store, GraduationCap, Settings } from "lucide-react";
import { toast } from "sonner";
import digitalIndiaLogo from "@/assets/digital-india-logo.png";

type RoleTab = "admin" | "retailer" | "trainer";
type AuthMethod = "email" | "otp";

export function LoginForm() {
  const { login, resetPassword, register } = useAuth();
  const navigate = useNavigate();

  const [roleTab, setRoleTab] = useState<RoleTab>("retailer");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  const demoCredentials: Record<RoleTab, { email: string; password: string }> = {
    admin: { email: "admin@eisolutions.com", password: "admin123" },
    retailer: { email: "retailer@eisolutions.com", password: "retailer123" },
    trainer: { email: "trainer@eisolutions.com", password: "trainer123" },
  };

  const fillDemo = () => {
    const creds = demoCredentials[roleTab];
    setEmail(creds.email);
    setPassword(creds.password);
  };

  const roleTabs: { key: RoleTab; label: string; icon: React.ReactNode }[] = [
    { key: "admin", label: "Admin", icon: <Settings className="w-3.5 h-3.5" /> },
    { key: "retailer", label: "Retailer", icon: <Store className="w-3.5 h-3.5" /> },
    { key: "trainer", label: "Trainer", icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gov-blue-dark via-gov-blue to-gov-blue-dark" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 20% 80%, hsl(216 70% 50% / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(25 100% 60% / 0.15) 0%, transparent 50%)"
      }} />

      {/* Tricolor top strip */}
      <div className="relative z-10 flex h-1.5">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 md:px-8 py-3">
        <div className="flex items-center gap-3">
          <img src={digitalIndiaLogo} alt="Digital India — Power to Empower" className="h-12 md:h-14 w-auto" width={512} height={512} />
        </div>
        <nav className="hidden md:flex items-center gap-6 text-white/80 text-sm">
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Help</a>
          <Button size="sm" className="bg-gov-gold hover:bg-gov-gold/90 text-white font-bold rounded-full px-5">
            Join ▾
          </Button>
        </nav>
      </header>

      {/* Curved tricolor wave */}
      <div className="relative z-10 h-6 overflow-hidden">
        <svg viewBox="0 0 1440 24" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,12 Q360,0 720,12 Q1080,24 1440,12 L1440,0 L0,0 Z" fill="hsl(25 100% 60%)" opacity="0.8" />
          <path d="M0,16 Q360,4 720,16 Q1080,28 1440,16 L1440,8 L0,8 Z" fill="white" opacity="0.6" />
          <path d="M0,20 Q360,8 720,20 Q1080,32 1440,20 L1440,14 L0,14 Z" fill="hsl(140 80% 28%)" opacity="0.7" />
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center px-4 md:px-12 lg:px-20 py-6 md:py-10">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* Left side — Hero content */}
          <div className="text-white space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                Digital India{" "}
                <span className="text-gov-gold">Franchise Opportunity</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed max-w-lg">
                Join India's largest digital service network backed by 100+ government and digital services. Help your community and earn up to ₹50,000 per month.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-lg">
              <FeatureCard icon="🏛️" title="100+ Services" desc="Bill pay, recharge, AEPS, GST & more" />
              <FeatureCard icon="🛡️" title="Trusted Platform" desc="Government-style security & compliance" />
              <FeatureCard icon="📚" title="Free Training" desc="Complete training & 24/7 support" />
              <FeatureCard icon="💰" title="Daily Earnings" desc="Real-time commission in your wallet" />
            </div>

            {/* CTA banner */}
            <div className="bg-gradient-to-r from-gov-gold/90 to-gov-saffron/90 rounded-lg px-5 py-3 max-w-lg">
              <p className="text-sm md:text-base font-bold text-white">
                🚀 Start your business with just ₹4,999 investment!
              </p>
            </div>
          </div>

          {/* Right side — Login card */}
          <div className="w-full max-w-md mx-auto lg:ml-auto">
            <div className="bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
              {/* Card header */}
              <div className="flex flex-col items-center pt-6 pb-4 px-6">
                <div className="w-14 h-14 rounded-full bg-gov-blue flex items-center justify-center mb-3 ring-4 ring-gov-gold/30">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-card-foreground">Secure Login</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Access your EI Solutions account</p>
              </div>

              <div className="px-6 pb-6 space-y-4">
                {/* Role tabs */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {roleTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => { setRoleTab(tab.key); setError(""); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                        roleTab === tab.key
                          ? "bg-gov-blue text-white"
                          : "bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Auth method tabs */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setAuthMethod("email")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                      authMethod === "email"
                        ? "bg-gov-blue text-white"
                        : "bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email
                  </button>
                  <button
                    onClick={() => setAuthMethod("otp")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                      authMethod === "otp"
                        ? "bg-gov-blue text-white"
                        : "bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" /> OTP
                  </button>
                </div>

                {/* Error / success messages */}
                {error && (
                  <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20">{error}</div>
                )}
                {resetSent && (
                  <div className="p-2.5 rounded-lg bg-success/10 text-success text-xs border border-success/20">
                    Password reset email sent!
                  </div>
                )}

                {/* Login form */}
                {showReset ? (
                  <form onSubmit={handleReset} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="pl-10 h-11" required />
                    </div>
                    <Button type="submit" className="w-full h-11 bg-gov-blue hover:bg-gov-blue-dark text-white font-bold text-sm">
                      Send Reset Link
                    </Button>
                    <button type="button" className="w-full text-xs text-gov-blue hover:underline" onClick={() => { setShowReset(false); setResetSent(false); }}>
                      Back to Login
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="pl-10 h-11" required />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="pl-10 pr-10 h-11"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button type="submit" className="w-full h-11 bg-gov-blue hover:bg-gov-blue-dark text-white font-bold text-sm" disabled={loading}>
                      {loading ? "Signing in..." : "Login"}
                    </Button>
                    <button type="button" className="w-full text-xs text-muted-foreground hover:text-gov-blue hover:underline" onClick={() => setShowReset(true)}>
                      Forgot Password?
                    </button>
                  </form>
                )}

                {/* Demo credentials */}
                <div className="text-center">
                  <button type="button" onClick={fillDemo} className="text-xs font-medium text-gov-blue hover:underline">
                    Use Demo Credentials
                  </button>
                  <div className="mt-2 bg-gov-blue-light rounded-lg p-3 text-xs text-left space-y-0.5">
                    <p><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground">{demoCredentials[roleTab].email}</span></p>
                    <p><span className="text-muted-foreground">Password:</span> <span className="font-medium text-foreground">{demoCredentials[roleTab].password}</span></p>
                  </div>
                </div>

                {/* Register link */}
                <div className="text-center space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">Don't have an account?</p>
                  <Button
                    variant="outline"
                    className="w-full h-10 font-bold text-sm border-gov-blue text-gov-blue hover:bg-gov-blue hover:text-white"
                    onClick={() => navigate({ to: "/register" as any })}
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Register as Franchise Partner
                  </Button>
                </div>

                {/* Footer links */}
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-2">
                  <a href="#" className="hover:text-foreground">Terms of Service</a>
                  <span>|</span>
                  <a href="#" className="hover:text-foreground">Privacy Policy</a>
                  <span>|</span>
                  <a href="#" className="hover:text-foreground">Help</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tricolor strip */}
      <div className="relative z-10 flex h-1.5">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4">
      <div className="text-2xl mb-1.5">{icon}</div>
      <h3 className="font-bold text-sm text-white">{title}</h3>
      <p className="text-xs text-white/70 mt-0.5 leading-snug">{desc}</p>
    </div>
  );
}
