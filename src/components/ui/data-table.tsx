import { useMemo, useState, type ReactNode } from "react";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  /** Cell renderer */
  render: (row: T) => ReactNode;
  /** Value used for searching & CSV export */
  value?: (row: T) => string | number | null | undefined;
  className?: string;
  /** Hide on mobile */
  hideOnMobile?: boolean;
};

interface DataTableProps<T extends { id?: string | number }> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Optional title bar */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Show loading skeleton */
  loading?: boolean;
  /** Initial search */
  searchPlaceholder?: string;
  /** Disable search box */
  disableSearch?: boolean;
  /** Page size — defaults to 10. Set to 0 to disable pagination */
  pageSize?: number;
  /** CSV export filename (without extension). If omitted, export button is hidden */
  exportFilename?: string;
  /** Empty state */
  emptyMessage?: string;
  /** Optional footer slot */
  footer?: ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
}

function downloadCSV<T>(
  filename: string,
  columns: DataTableColumn<T>[],
  rows: T[],
) {
  const header = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const raw = c.value ? c.value(r) : "";
          const v = raw === null || raw === undefined ? "" : String(raw);
          return `"${v.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  title,
  subtitle,
  loading,
  searchPlaceholder = "Search...",
  disableSearch,
  pageSize = 10,
  exportFilename,
  emptyMessage = "No records found.",
  footer,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columns.some((c) => {
        const v = c.value ? c.value(row) : "";
        return String(v ?? "").toLowerCase().includes(q);
      }),
    );
  }, [data, columns, query]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages);
  const paged = pageSize > 0
    ? filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
    : filtered;

  return (
    <div className="glass-card-v2 rounded-2xl overflow-hidden">
      {(title || !disableSearch || exportFilename) && (
        <div className="border-b border-border/60 bg-background/40 px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          {(title || subtitle) && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-1 rounded-full bg-premium-gradient shrink-0" aria-hidden />
              <div className="min-w-0">
                {title && (
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            </div>
          )}
          <div className="sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
            {!disableSearch && (
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 rounded-lg bg-background/70 backdrop-blur border-border/70"
                />
              </div>
            )}
            {exportFilename && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg gap-1.5 backdrop-blur"
                onClick={() => downloadCSV(exportFilename, columns, filtered)}
                disabled={filtered.length === 0}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`text-left px-4 py-2.5 font-semibold text-foreground/70 text-xs uppercase tracking-wider ${
                    c.hideOnMobile ? "hidden md:table-cell" : ""
                  } ${c.className || ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 ${c.hideOnMobile ? "hidden md:table-cell" : ""}`}
                    >
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-border/40 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/40"
                  }`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 ${c.hideOnMobile ? "hidden md:table-cell" : ""} ${c.className || ""}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(pageSize > 0 && filtered.length > pageSize) || footer ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 border-t border-border/60 bg-background/40">
          <div className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? "—"
              : `Showing ${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
          </div>
          {pageSize > 0 && filtered.length > pageSize && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-semibold tabular-nums px-2">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          {footer}
        </div>
      ) : null}
    </div>
  );
}
