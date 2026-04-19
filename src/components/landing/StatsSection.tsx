import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 5000, suffix: "+", label: "Active Retailers" },
  { value: 26, suffix: "+", label: "Integrated Services" },
  { value: 12, suffix: "L+", label: "Transactions Processed" },
  { value: 99.9, suffix: "%", label: "Platform Uptime" },
];

function useCountUp(target: number, start: boolean, durationMs = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, durationMs]);
  return val;
}

function Stat({ value, suffix, label, start }: { value: number; suffix: string; label: string; start: boolean }) {
  const v = useCountUp(value, start);
  const display = value < 100 ? v.toFixed(1).replace(/\.0$/, "") : Math.round(v).toLocaleString("en-IN");
  return (
    <div className="text-center">
      <p className="text-4xl font-extrabold tracking-tight text-premium-gradient sm:text-5xl">
        {display}
        {suffix}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setStart(true), { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <section ref={ref} className="border-y border-border bg-background/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} start={start} />
        ))}
      </div>
    </section>
  );
}
