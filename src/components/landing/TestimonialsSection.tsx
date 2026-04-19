import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Rahul Menon",
    role: "Retailer · Kollam",
    text: "Switched from 4 different portals to EI Solutions. My daily earnings went up 38% in the first month. The Malayalam support is a huge plus.",
    initials: "RM",
    grad: "from-blue-500 to-indigo-600",
  },
  {
    name: "Anitha Kumari",
    role: "Distributor · Ernakulam",
    text: "The commission and wallet system is the cleanest I've seen. I can audit every paisa across 60+ retailers without lifting a finger.",
    initials: "AK",
    grad: "from-fuchsia-500 to-rose-600",
  },
  {
    name: "Suresh P.",
    role: "Trainer",
    text: "Live multi-trainer classroom with avatars is fantastic. My retailers are 10× more engaged compared to plain Zoom calls.",
    initials: "SP",
    grad: "from-emerald-500 to-teal-600",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Loved across India</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Trusted by{" "}
            <span className="text-premium-gradient">thousands of CSC owners</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="card-tilt relative flex flex-col rounded-2xl border border-border bg-card p-7"
            >
              <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/15" />
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                "{t.text}"
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.grad} text-sm font-bold text-white`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
