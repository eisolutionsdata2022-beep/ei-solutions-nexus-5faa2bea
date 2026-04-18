import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Banknote,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import {
  subscribeCustomersAll,
  subscribeLoansAll,
} from "@/lib/finance-firebase";
import {
  type FinanceCustomer,
  type FinanceLoan,
  LOAN_STATUS_COLORS,
} from "@/lib/finance-types";
import { formatINR } from "@/lib/finance-calculations";

export const Route = createFileRoute("/admin/finance")({
  component: AdminFinancePage,
  ssr: false,
});

function AdminFinancePage() {
  const [customers, setCustomers] = useState<FinanceCustomer[]>([]);
  const [loans, setLoans] = useState<FinanceLoan[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const u1 = subscribeCustomersAll(setCustomers);
    const u2 = subscribeLoansAll(setLoans);
    return () => { u1(); u2(); };
  }, []);

  // Group loans by retailerId
  const branches = useMemo(() => {
    const map = new Map<string, { loans: FinanceLoan[]; customers: number; total: number; outstanding: number }>();
    loans.forEach((l) => {
      const b = map.get(l.retailerId) || { loans: [], customers: 0, total: 0, outstanding: 0 };
      b.loans.push(l);
      b.total += l.loanAmount;
      b.outstanding += l.outstandingPrincipal;
      map.set(l.retailerId, b);
    });
    customers.forEach((c) => {
      const b = map.get(c.retailerId);
      if (b) b.customers += 1;
    });
    return Array.from(map.entries()).map(([retailerId, data]) => ({ retailerId, ...data }));
  }, [loans, customers]);

  const filteredLoans = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter(
      (l) =>
        l.loanNo?.toLowerCase().includes(q) ||
        l.customerName?.toLowerCase().includes(q) ||
        l.customerMobile?.includes(q),
    );
  }, [loans, search]);

  const totals = {
    customers: customers.length,
    loans: loans.length,
    active: loans.filter((l) => l.status === "Active").length,
    closed: loans.filter((l) => l.status === "Closed").length,
    overdue: loans.filter((l) => l.status === "Active" && new Date(l.dueDate) < new Date()).length,
    disbursed: loans.reduce((s, l) => s + l.loanAmount, 0),
    outstanding: loans.filter((l) => l.status === "Active").reduce((s, l) => s + l.outstandingPrincipal, 0),
    goldStock: loans.filter((l) => l.status === "Active").reduce((s, l) => s + l.totalNetWeight, 0),
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="w-7 h-7 text-gov-blue" /> Finance — Admin Overview
        </h1>
        <p className="text-sm text-muted-foreground">All branches across the platform.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Customers" value={String(totals.customers)} icon={Users} />
        <StatCard label="Total Loans" value={String(totals.loans)} icon={Banknote} />
        <StatCard label="Active" value={String(totals.active)} icon={Wallet} />
        <StatCard label="Overdue" value={String(totals.overdue)} icon={AlertTriangle} />
        <StatCard label="Closed" value={String(totals.closed)} icon={CheckCircle2} />
        <StatCard label="Disbursed" value={formatINR(totals.disbursed)} icon={TrendingUp} />
        <StatCard label="Outstanding" value={formatINR(totals.outstanding)} icon={Wallet} />
        <StatCard label="Gold Stock" value={`${totals.goldStock.toFixed(2)}g`} icon={Banknote} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Branches</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {branches.map((b) => (
              <div key={b.retailerId} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{b.retailerId.slice(0, 12)}...</p>
                  <p className="text-sm">
                    {b.loans.length} loans · {b.customers} customers
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatINR(b.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    Outstanding: {formatINR(b.outstanding)}
                  </p>
                </div>
              </div>
            ))}
            {branches.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No branches yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All Loans</CardTitle></CardHeader>
        <CardContent>
          <Input
            placeholder="Search loans by no, customer name, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredLoans.map((l) => {
              const isOverdue = l.status === "Active" && new Date(l.dueDate) < new Date();
              return (
                <div key={l.id} className="flex justify-between items-center text-xs border-b py-1.5">
                  <div>
                    <p className="font-semibold">{l.loanNo} · {l.customerName}</p>
                    <p className="text-muted-foreground">
                      {l.customerMobile} · {formatINR(l.loanAmount)} · {l.totalNetWeight.toFixed(2)}g
                    </p>
                  </div>
                  <Badge variant="outline" className={LOAN_STATUS_COLORS[isOverdue ? "Overdue" : l.status]}>
                    {isOverdue ? "Overdue" : l.status}
                  </Badge>
                </div>
              );
            })}
            {filteredLoans.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No loans.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-gov-blue" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
