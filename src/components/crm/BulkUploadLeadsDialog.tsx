import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { addLead, addLeadHistory, getNextLeadId } from "@/lib/crm-firebase";
import {
  LEAD_STATUSES, PAYMENT_STATUSES, APP_PROGRESS, LEAD_SOURCES,
  type LeadStatus, type PaymentStatus, type ApplicationProgress, type StaffMember,
} from "@/lib/crm-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
}

interface ParsedRow {
  rowNum: number;
  name: string;
  phone: string;
  alternatePhone: string;
  location: string;
  courseInterested: string;
  leadSource: string;
  assignedStaffEmail: string;
  status: LeadStatus;
  followUpDate: string;
  followUpTime: string;
  remarks: string;
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationProgress;
  errors: string[];
}

const HEADERS = [
  "Name *",
  "Phone *",
  "Alternate Phone",
  "Location",
  "Course/Service",
  "Lead Source",
  "Assigned Staff Email",
  "Status",
  "Follow-up Date (YYYY-MM-DD)",
  "Follow-up Time (HH:MM)",
  "Remarks",
  "Payment Status",
  "Application Status",
];

function downloadTemplate() {
  const sample = [
    HEADERS,
    [
      "Ramesh Kumar", "9876543210", "9876543200", "Ernakulam",
      "PAN Card Service", "Facebook", "", "New",
      "2025-04-25", "11:00", "Wants franchise info", "Pending", "Not Started",
    ],
    [
      "Anjali Nair", "9123456780", "", "Thrissur",
      "Aadhaar Update", "Reference", "", "Contacted",
      "", "", "Called once, will follow-up", "Pending", "In Progress",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sample);
  // Column widths
  ws["!cols"] = [
    { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    { wch: 22 }, { wch: 14 }, { wch: 24 }, { wch: 14 },
    { wch: 22 }, { wch: 18 }, { wch: 30 }, { wch: 14 }, { wch: 18 },
  ];

  // Reference sheet with allowed values
  const refData = [
    ["Allowed Values Reference"],
    [],
    ["Status", ...LEAD_STATUSES],
    ["Payment Status", ...PAYMENT_STATUSES],
    ["Application Status", ...APP_PROGRESS],
    ["Lead Source", ...LEAD_SOURCES],
    [],
    ["Notes:"],
    ["• Phone must be 10 digits starting with 6/7/8/9"],
    ["• Date format: YYYY-MM-DD (e.g., 2025-04-25)"],
    ["• Time format: HH:MM 24-hr (e.g., 14:30)"],
    ["• Assigned Staff Email — leave blank to keep Unassigned"],
    ["• Required columns marked with *"],
  ];
  const refWs = XLSX.utils.aoa_to_sheet(refData);
  refWs["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.utils.book_append_sheet(wb, refWs, "Reference");
  XLSX.writeFile(wb, `CRM_Leads_Upload_Template.xlsx`);
  toast.success("Template downloaded");
}

function normalize(v: any): string {
  return String(v ?? "").trim();
}

function parseSheet(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function validateRow(raw: any[], rowNum: number, staff: StaffMember[]): ParsedRow {
  const errors: string[] = [];
  const get = (i: number) => normalize(raw[i]);

  const name = get(0);
  const phone = get(1).replace(/\D/g, "");
  const alternatePhone = get(2).replace(/\D/g, "");
  const location = get(3);
  const courseInterested = get(4);
  const leadSource = get(5) || "Other";
  const assignedStaffEmail = get(6).toLowerCase();
  const statusRaw = get(7) || "New";
  const followUpDate = get(8);
  const followUpTime = get(9);
  const remarks = get(10);
  const paymentRaw = get(11) || "Pending";
  const appRaw = get(12) || "Not Started";

  if (!name || name.length < 2) errors.push("Name required (min 2 chars)");
  if (!/^[6-9]\d{9}$/.test(phone)) errors.push("Phone must be 10 digits, start 6-9");
  if (alternatePhone && !/^[6-9]\d{9}$/.test(alternatePhone)) errors.push("Alt phone invalid");

  const status = LEAD_STATUSES.includes(statusRaw as LeadStatus) ? (statusRaw as LeadStatus) : "New";
  if (!LEAD_STATUSES.includes(statusRaw as LeadStatus) && statusRaw !== "New") {
    errors.push(`Status "${statusRaw}" invalid (using "New")`);
  }

  const paymentStatus = PAYMENT_STATUSES.includes(paymentRaw as PaymentStatus)
    ? (paymentRaw as PaymentStatus) : "Pending";
  const applicationStatus = APP_PROGRESS.includes(appRaw as ApplicationProgress)
    ? (appRaw as ApplicationProgress) : "Not Started";

  if (followUpDate && !/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) errors.push("Date must be YYYY-MM-DD");
  if (followUpTime && !/^\d{2}:\d{2}$/.test(followUpTime)) errors.push("Time must be HH:MM");

  if (assignedStaffEmail && !staff.some((s) => s.email.toLowerCase() === assignedStaffEmail)) {
    errors.push(`Staff "${assignedStaffEmail}" not found`);
  }

  return {
    rowNum, name, phone, alternatePhone, location, courseInterested,
    leadSource, assignedStaffEmail, status, followUpDate, followUpTime,
    remarks, paymentStatus, applicationStatus, errors,
  };
}

export function BulkUploadLeadsDialog({ open, onOpenChange, staff }: Props) {
  const { appUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, fail: 0 });

  const reset = () => {
    setParsed([]);
    setProgress({ done: 0, total: 0, ok: 0, fail: 0 });
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleFile = async (file: File) => {
    try {
      const rows = await parseSheet(file);
      if (rows.length < 2) {
        toast.error("File is empty or has no data rows");
        return;
      }
      // Skip header row, drop empty rows
      const dataRows = rows.slice(1).filter((r) => r.some((cell) => normalize(cell)));
      if (dataRows.length === 0) {
        toast.error("No data rows found");
        return;
      }
      const validated = dataRows.map((r, i) => validateRow(r, i + 2, staff));
      setParsed(validated);
      const validCount = validated.filter((r) => r.errors.length === 0).length;
      toast.success(`${validated.length} rows parsed — ${validCount} valid`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse file");
    }
  };

  const handleUpload = async () => {
    const valid = parsed.filter((r) => r.errors.length === 0);
    if (valid.length === 0) {
      toast.error("No valid rows to upload");
      return;
    }
    setUploading(true);
    setProgress({ done: 0, total: valid.length, ok: 0, fail: 0 });

    let ok = 0, fail = 0;
    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      try {
        const leadId = await getNextLeadId();
        const staffMember = staff.find((s) => s.email.toLowerCase() === row.assignedStaffEmail);
        const now = new Date().toISOString();

        await addLead({
          leadId,
          name: row.name,
          phone: row.phone,
          alternatePhone: row.alternatePhone,
          location: row.location,
          courseInterested: row.courseInterested,
          leadSource: row.leadSource,
          assignedStaffId: staffMember?.uid || "",
          assignedStaffName: staffMember?.name || "Unassigned",
          status: row.status,
          followUpDate: row.followUpDate,
          followUpTime: row.followUpTime,
          remarks: row.remarks,
          paymentStatus: row.paymentStatus,
          applicationStatus: row.applicationStatus,
          documents: [],
          createdAt: now,
          updatedAt: now,
          createdBy: appUser?.email || "bulk-upload",
        });

        await addLeadHistory({
          leadId,
          action: "Created",
          field: "lead",
          oldValue: "",
          newValue: `Lead ${leadId} bulk-imported (row ${row.rowNum})`,
          updatedBy: appUser?.uid || "",
          updatedByName: appUser?.name || appUser?.email || "Bulk Upload",
          createdAt: now,
        });

        ok++;
      } catch (err) {
        console.error(`Row ${row.rowNum} failed:`, err);
        fail++;
      }
      setProgress({ done: i + 1, total: valid.length, ok, fail });
    }

    setUploading(false);
    if (fail === 0) {
      toast.success(`${ok} leads imported successfully!`);
      reset();
      onOpenChange(false);
    } else {
      toast.warning(`Imported ${ok}, failed ${fail}`);
    }
  };

  const validCount = parsed.filter((r) => r.errors.length === 0).length;
  const errorCount = parsed.length - validCount;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Upload Leads
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Template */}
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-sm">Step 1 — Download template</p>
                <p className="text-xs text-muted-foreground">Excel file with columns + sample rows + reference values</p>
              </div>
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Upload */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="font-semibold text-sm">Step 2 — Upload filled file</p>
                <p className="text-xs text-muted-foreground">Accepts .xlsx, .xls, .csv (max 1000 rows recommended)</p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </CardContent>
          </Card>

          {/* Preview */}
          {parsed.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Step 3 — Review & Import</p>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> {validCount} Valid
                    </Badge>
                    {errorCount > 0 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" /> {errorCount} With Errors
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto rounded border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Row</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((r) => (
                        <tr key={r.rowNum} className={r.errors.length > 0 ? "bg-destructive/5" : ""}>
                          <td className="p-2 font-mono">{r.rowNum}</td>
                          <td className="p-2">{r.name || <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-2 font-mono">{r.phone || <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-2">{r.status}</td>
                          <td className="p-2">
                            {r.errors.length === 0
                              ? <span className="text-emerald-600">✓ OK</span>
                              : <span className="text-destructive">{r.errors.join(", ")}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {uploading && (
                  <div className="rounded bg-muted p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Importing {progress.done} / {progress.total} — ✓{progress.ok} ✗{progress.fail}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded bg-background">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          {parsed.length > 0 && (
            <Button onClick={handleUpload} disabled={uploading || validCount === 0}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Import {validCount} Leads
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
