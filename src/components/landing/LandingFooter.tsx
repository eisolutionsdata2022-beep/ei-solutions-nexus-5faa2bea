import { Link } from "@tanstack/react-router";
import eiBrandMark from "@/assets/ei-brand-mark.png";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <img src={eiBrandMark} alt="EI Solutions" width={36} height={36} loading="lazy" className="h-9 w-9 object-contain" />
              <p className="text-base font-bold tracking-tight text-foreground">
                EI <span className="text-premium-gradient">Solutions</span>
              </p>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Janasevana Kendram — a unified digital platform for India's CSC retailers,
              distributors, trainers and staff.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Platform</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><a href="#services" className="hover:text-foreground">Services</a></li>
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Account</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><Link to="/login" className="hover:text-foreground">Sign in</Link></li>
              <li><Link to="/register" className="hover:text-foreground">Create account</Link></li>
              <li><Link to="/install" className="hover:text-foreground">Install app</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} EI Solutions Janasevana Kendram. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with ♥ for India's digital service ecosystem.
          </p>
        </div>
      </div>
    </footer>
  );
}
