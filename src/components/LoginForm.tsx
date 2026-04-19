import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";
import eiSolutionsLogo from "@/assets/ei-solutions-3d-logo.png";
import loginIllustration from "@/assets/login-illustration.png";

export function LoginForm() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

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
      const dest =
        appUser.role === "operator" ? "/operator"
        : appUser.role === "staffSub" ? "/retailer"
        : `/${appUser.role}`;
      navigate({ to: dest as any });
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(220 20% 95%)" }}>
      {/* Card container */}
      <div className="w-full max-w-5xl bg-card rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[540px]">

        {/* Left — Form side */}
        <div className="flex flex-col justify-center px-8 md:px-14 py-10">
          {/* 3D EI SOLUTIONS Logo */}
          <div className="flex flex-col items-center mb-8 animate-logo-entrance">
            <img
              src={eiSolutionsLogo}
              alt="EI SOLUTIONS — Digital Services Platform"
              className="h-20 md:h-24 w-auto logo-glow"
              width={1280}
              height={512}
              fetchPriority="high"
              decoding="async"
            />
            <p className="mt-2 text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-gov-blue">
              Digital Services Platform
            </p>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 text-center lg:text-left">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mb-6 text-center lg:text-left">Sign in to your account</p>

          {/* Error / success */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 mb-4">
              {error}
            </div>
          )}
          {resetSent && (
            <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200 mb-4">
              Password reset email sent!
            </div>
          )}

          {showReset ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="pl-11 h-12 rounded-lg border-border/60"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-lg font-bold text-sm bg-gov-blue text-white hover:bg-gov-blue-dark"
              >
                Send Reset Link
              </Button>
              <button
                type="button"
                className="w-full text-sm hover:underline text-gov-blue"
                onClick={() => { setShowReset(false); setResetSent(false); }}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or Mobile Number"
                  className="pl-11 h-12 rounded-lg border-border/60"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="pl-11 pr-11 h-12 rounded-lg border-border/60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-right">
                <button
                  type="button"
                className="text-sm font-medium hover:underline text-gov-blue"
                  onClick={() => setShowReset(true)}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-lg font-bold text-base text-white bg-gov-blue hover:bg-gov-blue-dark"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          )}

          {/* Sign-up link */}
          <p className="mt-8 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button
              type="button"
              className="font-semibold hover:underline text-gov-blue"
              onClick={() => navigate({ to: "/register" as any })}
            >
              Sign Up
            </button>
          </p>
        </div>

        {/* Right — Illustration side */}
        <div
          className="hidden lg:flex items-center justify-center p-10"
          style={{ background: "linear-gradient(135deg, hsl(215 30% 94%), hsl(215 40% 90%))" }}
        >
          <img
            src={loginIllustration}
            alt="Digital workspace illustration"
            className="w-full max-w-md h-auto object-contain"
            width={1024}
            height={1024}
          />
        </div>
      </div>
    </div>
  );
}
