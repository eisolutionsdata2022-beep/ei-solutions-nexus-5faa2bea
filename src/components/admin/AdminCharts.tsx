import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Txn = {
  id?: string;
  type?: string;
  amount?: number;
  createdAt?: string | number | Date;
};

type UserDoc = {
  id?: string;
  createdAt?: string | number | Date;
  role?: string;
};

const dayLabel = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

function buildLast14Days() {
  const days: { key: string; label: string; date: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: dayLabel(d),
      date: d,
    });
  }
  return days;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  // Firestore Timestamp shape
  if (typeof v === "object" && v !== null && "seconds" in (v as any)) {
    return new Date(((v as any).seconds as number) * 1000);
  }
  return null;
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow: "0 10px 30px -12px rgb(0 0 0 / 0.25)",
};

export function RevenueChart({ transactions }: { transactions: Txn[] }) {
  const data = useMemo(() => {
    const days = buildLast14Days();
    const map = new Map(days.map((d) => [d.key, { ...d, revenue: 0 }]));
    transactions.forEach((t) => {
      if (t.type !== "debit") return;
      const d = toDate(t.createdAt);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      if (row) row.revenue += t.amount || 0;
    });
    return Array.from(map.values()).map((r) => ({
      label: r.label,
      revenue: Math.round(r.revenue),
    }));
  }, [transactions]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(216 90% 60%)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="hsl(280 80% 60%)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(216 90% 55%)"
            strokeWidth={2.5}
            fill="url(#revGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UserGrowthChart({ users }: { users: UserDoc[] }) {
  const data = useMemo(() => {
    const days = buildLast14Days();
    const map = new Map(days.map((d) => [d.key, { ...d, count: 0 }]));
    users.forEach((u) => {
      const d = toDate(u.createdAt);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      if (row) row.count += 1;
    });
    let cumulative = 0;
    return Array.from(map.values()).map((r) => {
      cumulative += r.count;
      return { label: r.label, signups: r.count, total: cumulative };
    });
  }, [users]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="signups"
            stroke="hsl(160 70% 45%)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "hsl(160 70% 45%)" }}
            activeDot={{ r: 5 }}
            name="New Signups"
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="hsl(280 80% 60%)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            name="Cumulative"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TransactionsChart({ transactions }: { transactions: Txn[] }) {
  const data = useMemo(() => {
    const days = buildLast14Days();
    const map = new Map(
      days.map((d) => [d.key, { ...d, debit: 0, credit: 0 }]),
    );
    transactions.forEach((t) => {
      const d = toDate(t.createdAt);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      if (!row) return;
      if (t.type === "debit") row.debit += 1;
      else if (t.type === "credit") row.credit += 1;
    });
    return Array.from(map.values()).map((r) => ({
      label: r.label,
      debit: r.debit,
      credit: r.credit,
    }));
  }, [transactions]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="credit" fill="hsl(160 70% 45%)" radius={[6, 6, 0, 0]} name="Credit" />
          <Bar dataKey="debit" fill="hsl(216 80% 55%)" radius={[6, 6, 0, 0]} name="Debit" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
