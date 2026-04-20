import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitLandingEnquiry } from "@/lib/bulk-comm-firebase";

export function CTASection() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", interestedIn: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email or leave it blank");
      return;
    }
    setLoading(true);
    try {
      await submitLandingEnquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        interestedIn: form.interestedIn.trim(),
        message: form.message.trim(),
      });
      setDone(true);
      toast.success("ഞങ്ങൾ ഉടൻ contact ചെയ്യും — Thank you!");
    } catch (err) {
      console.error(err);
      toast.error("Submission failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-2 items-center">
        {/* Left: pitch */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-premium-gradient p-10 text-white shadow-premium sm:p-12">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" aria-hidden />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/30 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Limited-time onboarding offer
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to upgrade your CSC?
            </h2>
            <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
              Join thousands of retailers earning more with a faster, smarter, fully unified platform.
              No credit card. No setup fees.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="group h-12 w-full bg-white px-8 text-base font-bold text-primary shadow-lg hover:bg-white/95 sm:w-auto">
                  Create free account
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="h-12 w-full border-white/40 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-md hover:bg-white/20 hover:text-white sm:w-auto">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: callback form */}
        <div className="rounded-3xl border border-border bg-card p-8 shadow-premium sm:p-10">
          {done ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
              <h3 className="text-2xl font-bold text-foreground">Thank you!</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                Our team will contact you within 24 hours. നന്ദി!
              </p>
              <Button variant="outline" onClick={() => { setDone(false); setForm({ name: "", email: "", phone: "", interestedIn: "", message: "" }); }} className="mt-6">
                Submit another enquiry
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Get a callback</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Free demo. Pricing details. WhatsApp support. Submit, ഞങ്ങൾ വിളിക്കാം.
                </p>
              </div>
              <Input placeholder="Your name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input type="tel" placeholder="Phone (WhatsApp) *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <Input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="What are you interested in? (PAN, Recharge, Finance…)" value={form.interestedIn} onChange={(e) => setForm({ ...form, interestedIn: e.target.value })} />
              <Textarea placeholder="Anything else we should know?" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <Button type="submit" size="lg" className="w-full h-12 text-base font-bold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? "Submitting…" : "Request callback"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                By submitting, you agree to receive WhatsApp & calls from EI Solutions.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
