import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, CheckCircle2, SignalLow, SignalMedium, SignalHigh } from "lucide-react";
import { getRecentQualityLogs, type SessionQualitySample } from "@/lib/session-quality-logs";

export const Route = createFileRoute("/admin/session-quality")({
  ssr: false,
  component: AdminSessionQuality,
});

interface SessionGroup {
  trainingId: string;
  trainingTitle: string;
  samples: SessionQualitySample[];
  viewerCount: number;
  poorPct: number;
  avgRtt: number;
  avgJitter: number;
  avgLoss: number;
  lastAt: string;
}

function AdminSessionQuality() {
  const [logs, setLogs] = useState<SessionQualitySample[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "good" | "medium" | "poor">("all");

  useEffect(() => {
    getRecentQualityLogs(1000)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo<SessionGroup[]>(() => {
    const map = new Map<string, SessionQualitySample[]>();
    logs.forEach((l) => {
      const arr = map.get(l.trainingId) || [];
      arr.push(l);
      map.set(l.trainingId, arr);
    });
    const out: SessionGroup[] = [];
    map.forEach((samples, trainingId) => {
      const viewers = new Set(samples.map((s) => s.viewerId));
      const poor = samples.filter((s) => s.quality === "poor").length;
      const avg = (key: keyof SessionQualitySample) =>
        samples.reduce((a, s) => a + (Number(s[key]) || 0), 0) / samples.length;
      const lastAt = samples.reduce((m, s) => (s.createdAt > m ? s.createdAt : m), "");
      out.push({
        trainingId,
        trainingTitle: samples.find((s) => s.trainingTitle)?.trainingTitle || trainingId,
        samples: samples.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        viewerCount: viewers.size,
        poorPct: Math.round((poor / samples.length) * 100),
        avgRtt: Math.round(avg("rtt")),
        avgJitter: Math.round(avg("jitter")),
        avgLoss: Math.round(avg("loss") * 10) / 10,
        lastAt,
      });
    });
    out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    return out;
  }, [logs]);

  const filteredGroups = groups.filter((g) => {
    const matchesSearch = !search || g.trainingTitle.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "all") return true;
    return g.samples.some((s) => s.quality === filter);
  });

  const totals = useMemo(() => {
    const good = logs.filter((l) => l.quality === "good").length;
    const medium = logs.filter((l) => l.quality === "medium").length;
    const poor = logs.filter((l) => l.quality === "poor").length;
    return { good, medium, poor, total: logs.length };
  }, [logs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" /> Session Quality Logs
        </h1>
        <p className="text-muted-foreground text-sm">
          Network samples (RTT, jitter, packet loss) collected every 30s and on quality changes during live training sessions.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total samples" value={totals.total} icon={<Activity className="w-4 h-4" />} />
        <SummaryCard label="Good" value={totals.good} tone="emerald" icon={<SignalHigh className="w-4 h-4" />} />
        <SummaryCard label="Fair" value={totals.medium} tone="amber" icon={<SignalMedium className="w-4 h-4" />} />
        <SummaryCard label="Poor" value={totals.poor} tone="red" icon={<SignalLow className="w-4 h-4" />} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by training title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            <SelectItem value="poor">With Poor samples</SelectItem>
            <SelectItem value="medium">With Fair samples</SelectItem>
            <SelectItem value="good">With Good samples</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}
      {!loading && filteredGroups.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
          No quality logs match your filters.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {filteredGroups.map((g) => <SessionCard key={g.trainingId} group={g} />)}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone, icon }: { label: string; value: number; tone?: "emerald" | "amber" | "red"; icon: React.ReactNode }) {
  const toneCls = tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 text-xs text-muted-foreground ${toneCls}`}>{icon}{label}</div>
        <p className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function SessionCard({ group }: { group: SessionGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hasIssues = group.poorPct > 10;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {hasIssues && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {group.trainingTitle}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {group.viewerCount} viewer{group.viewerCount === 1 ? "" : "s"} · {group.samples.length} samples · last {new Date(group.lastAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">RTT {group.avgRtt}ms</Badge>
            <Badge variant="outline">Jitter {group.avgJitter}ms</Badge>
            <Badge variant="outline">Loss {group.avgLoss}%</Badge>
            <Badge variant={hasIssues ? "destructive" : "secondary"}>{group.poorPct}% poor</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary hover:underline"
        >
          {expanded ? "Hide" : "Show"} {group.samples.length} samples
        </button>
        {expanded && (
          <div className="mt-3 max-h-[400px] overflow-y-auto rounded border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Viewer</th>
                  <th className="text-left p-2">Quality</th>
                  <th className="text-right p-2">RTT</th>
                  <th className="text-right p-2">Jitter</th>
                  <th className="text-right p-2">Loss</th>
                  <th className="text-left p-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {group.samples.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-2 whitespace-nowrap">{new Date(s.createdAt).toLocaleTimeString()}</td>
                    <td className="p-2">{s.viewerName || s.viewerId.slice(0, 8)}</td>
                    <td className="p-2">
                      <Badge
                        variant={s.quality === "poor" ? "destructive" : s.quality === "medium" ? "secondary" : "default"}
                        className={s.quality === "good" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                      >
                        {s.quality}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{s.rtt}ms</td>
                    <td className="p-2 text-right">{s.jitter}ms</td>
                    <td className="p-2 text-right">{s.loss}%</td>
                    <td className="p-2 text-muted-foreground">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
