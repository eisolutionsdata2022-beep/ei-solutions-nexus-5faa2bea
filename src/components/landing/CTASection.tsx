import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-premium-gradient p-10 text-center shadow-premium sm:p-16">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" aria-hidden />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/30 blur-3xl" aria-hidden />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Limited-time onboarding offer
            </div>

            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              Ready to upgrade your CSC?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/85 sm:text-lg">
              Join thousands of retailers earning more with a faster, smarter, fully unified
              platform. No credit card. No setup fees.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="group h-12 w-full bg-white px-8 text-base font-bold text-primary shadow-lg hover:bg-white/95 sm:w-auto"
                >
                  Create free account
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-white/40 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-md hover:bg-white/20 hover:text-white sm:w-auto"
                >
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
