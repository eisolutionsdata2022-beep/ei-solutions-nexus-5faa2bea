import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { useFinanceAuth } from "@/lib/finance-auth-context";

export const Route = createFileRoute("/finance/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finance Portal — Secure Sign In" },
      { name: "description", content: "Restricted access. Authorised finance users only." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FinanceLoginPage,
});

function FinanceLoginPage() {
  const { signIn } = useFinanceAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signIn(username.trim(), password);
      navigate({ to: "/finance" as any, replace: true });
    } catch (error: any) {
      const msg = String(error?.code || error?.message || "");
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
        setErr("Invalid username or password.");
      } else if (msg.includes("too-many-requests")) {
        setErr("Too many attempts. Try again in a few minutes.");
      } else {
        setErr(error?.message || "Sign-in failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,rgba(56,189,248,0.18)_0%,transparent_70%),radial-gradient(40%_40%_at_80%_100%,rgba(168,85,247,0.18)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              EI Solutions
            </p>
            <h1 className="text-lg font-bold leading-tight">Finance Portal</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Sign in to continue</h2>
          <p className="mt-1 text-sm text-slate-400">
            This area is restricted. Use the credentials provided by your administrator.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Username
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="your-username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {err && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/40 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in securely"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            No account? Contact your administrator. Public registration is disabled.
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-600">
          © {new Date().getFullYear()} EI Solutions · All access is logged and audited.
        </p>
      </div>
    </div>
  );
}
