import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Trash2,
  AlertTriangle,
  RefreshCw,
  Database,
  HardDrive,
} from "lucide-react";
import {
  CLEANUP_CATEGORIES,
  countCategory,
  purgeCategory,
  type CleanupCategory,
} from "@/lib/system-cleanup";

export const Route = createFileRoute("/admin/system-cleanup")({
  ssr: false,
  component: SystemCleanupPage,
});

type Counts = Record<string, { total: number; loading: boolean }>;

function SystemCleanupPage() {
  const [counts, setCounts] = useState<Counts>({});
  const [olderThanDays, setOlderThanDays] = useState<string>("0"); // 0 = all
  const [confirmCat, setConfirmCat] = useState<CleanupCategory | null>(null);
  const [purging, setPurging] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  async function refreshCounts() {
    const days = parseInt(olderThanDays, 10) || 0;
    const next: Counts = {};
    CLEANUP_CATEGORIES.forEach((c) => {
      next[c.key] = { total: counts[c.key]?.total ?? 0, loading: true };
    });
    setCounts(next);

    await Promise.all(
      CLEANUP_CATEGORIES.map(async (cat) => {
        try {
          const res = await countCategory(cat, { olderThanDays: days });
          const total = res.reduce((s, r) => s + r.count, 0);
          setCounts((prev) => ({
            ...prev,
            [cat.key]: { total, loading: false },
          }));
        } catch (err) {
          console.error("count failed", cat.key, err);
          setCounts((prev) => ({
            ...prev,
            [cat.key]: { total: 0, loading: false },
          }));
        }
      }),
    );
  }

  useEffect(() => {
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [olderThanDays]);

  async function handlePurge(cat: CleanupCategory) {
    setPurging(cat.key);
    setProgress("Starting...");
    const days = parseInt(olderThanDays, 10) || 0;
    try {
      const res = await purgeCategory(
        cat,
        { olderThanDays: days },
        (col, done, total) => {
          setProgress(`${col}: ${done}/${total}`);
        },
      );
      const totalDeleted = res.reduce((s, r) => s + r.count, 0);
      toast.success(
        `${cat.label}: ${totalDeleted} records deleted`,
      );
      await refreshCounts();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed: ${err?.message || "unknown error"}`);
    } finally {
      setPurging(null);
      setProgress("");
      setConfirmCat(null);
    }
  }

  const ageLabel =
    olderThanDays === "0"
      ? "ALL records"
      : `older than ${olderThanDays} days`;

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardDrive className="w-7 h-7 text-gov-blue" /> System Cleanup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Permanently delete old data to free up storage and speed up the
            system. Critical data (users, wallet balances, configs, active
            services) is never touched.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshCounts}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh counts
        </Button>
      </header>

      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Deletion is permanent
            </p>
            <p className="text-amber-800 dark:text-amber-300 mt-1">
              Records cannot be recovered after deletion. Use the age filter
              to keep recent data and delete only old entries.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" /> Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Delete records:</span>
          <Select value={olderThanDays} onValueChange={setOlderThanDays}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All records (no age filter)</SelectItem>
              <SelectItem value="30">Older than 30 days</SelectItem>
              <SelectItem value="60">Older than 60 days</SelectItem>
              <SelectItem value="90">Older than 90 days</SelectItem>
              <SelectItem value="180">Older than 180 days</SelectItem>
              <SelectItem value="365">Older than 1 year</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">Currently showing: {ageLabel}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {CLEANUP_CATEGORIES.map((cat) => {
          const c = counts[cat.key];
          const total = c?.total ?? 0;
          const loading = c?.loading ?? true;
          const isPurging = purging === cat.key;
          const disabled = loading || isPurging || total === 0;
          return (
            <Card key={cat.key}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{cat.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cat.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 font-mono mt-1 truncate">
                      {cat.collections.join(", ")}
                    </p>
                  </div>
                  <Badge
                    variant={total > 0 ? "default" : "secondary"}
                    className="text-base shrink-0"
                  >
                    {loading ? "…" : total.toLocaleString()}
                  </Badge>
                </div>
                {isPurging && progress && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {progress}
                  </p>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={disabled}
                  onClick={() => setConfirmCat(cat)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isPurging
                    ? "Deleting..."
                    : total === 0
                      ? "Nothing to delete"
                      : `Delete ${total.toLocaleString()} records`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={!!confirmCat}
        onOpenChange={(o) => !o && !purging && setConfirmCat(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Permanently delete {confirmCat?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              <strong>
                {confirmCat
                  ? counts[confirmCat.key]?.total?.toLocaleString() ?? 0
                  : 0}{" "}
                records
              </strong>{" "}
              from {confirmCat?.collections.length} collection(s) (
              {ageLabel}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!purging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!purging}
              onClick={() => confirmCat && handlePurge(confirmCat)}
            >
              {purging ? "Deleting..." : "Yes, delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
