/**
 * Staff — read-only Horoscope requests list (for support / monitoring).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sparkles, Eye, Download } from "lucide-react";
import { toast } from "sonner";

import { subscribeHoroscopeRequests } from "@/lib/horoscope-firebase";
import { STATUS_COLORS, PRODUCT_LABELS, type HoroscopeRequest } from "@/lib/horoscope-types";
import { downloadHoroscopePdf, openPrintableReport } from "@/lib/horoscope-pdf";

export const Route = createFileRoute("/staff/horoscope-requests")({
  ssr: false,
  component: StaffHoroscope,
});

function StaffHoroscope() {
  const [rows, setRows] = useState<HoroscopeRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => subscribeHoroscopeRequests(setRows), []);

  async function handleDownload(r: HoroscopeRequest) {
    if (!r.report) { toast.error("No report yet."); return; }
    setLoadingId(r.id || "");
    try {
      await downloadHoroscopePdf(r);
    } catch {
      openPrintableReport(r);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-amber-100 text-amber-700"><Sparkles className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl font-bold">Horoscope Requests</h1>
          <p className="text-sm text-muted-foreground">Monitor & assist retailers</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All Requests ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-6">No requests.</p>
            : <div className="overflow-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.customerName}</div>
                          <div className="text-[11px] text-muted-foreground">{r.placeOfBirth}</div>
                        </TableCell>
                        <TableCell className="text-xs">{r.userName || r.userId.slice(0, 8)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">
                          {PRODUCT_LABELS[r.product]?.emoji} {r.product}
                        </Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${STATUS_COLORS[r.status]}`} variant="outline">{r.status}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openPrintableReport(r)} disabled={!r.report}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" onClick={() => handleDownload(r)} disabled={!r.report || loadingId === r.id}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}