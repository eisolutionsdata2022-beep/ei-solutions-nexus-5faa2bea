import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SERVICE_CATALOG } from "@/lib/service-catalog";
import { FileText, Leaf } from "lucide-react";

export function ServiceCatalogView() {
  const certificates = SERVICE_CATALOG.filter((s) => s.category === "certificate");
  const others = SERVICE_CATALOG.filter((s) => s.category === "other");

  return (
    <div className="space-y-6">
      {/* Certificate Services */}
      <Card className="border-gov-blue/30">
        <CardHeader className="bg-gov-blue-light py-3 px-4 border-b border-gov-blue/20">
          <CardTitle className="text-sm font-bold text-gov-blue flex items-center gap-2">
            <FileText className="w-4 h-4" /> Certificate Services
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gov-blue/5">
                  <TableHead className="text-xs font-bold">Service Name</TableHead>
                  <TableHead className="text-xs font-bold">Processing</TableHead>
                  <TableHead className="text-xs font-bold">Validity</TableHead>
                  <TableHead className="text-xs font-bold">Fee</TableHead>
                  <TableHead className="text-xs font-bold">Required Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-xs font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs">{s.processingDays}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.validity}</Badge></TableCell>
                    <TableCell className="text-xs font-semibold">₹{s.fee}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.requiredDocuments.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Other Services */}
      <Card className="border-gov-green/30">
        <CardHeader className="bg-green-50 py-3 px-4 border-b border-gov-green/20">
          <CardTitle className="text-sm font-bold text-gov-green flex items-center gap-2">
            <Leaf className="w-4 h-4" /> Other Services
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50/50">
                  <TableHead className="text-xs font-bold">Service Name</TableHead>
                  <TableHead className="text-xs font-bold">Processing</TableHead>
                  <TableHead className="text-xs font-bold">Fee</TableHead>
                  <TableHead className="text-xs font-bold">Required Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {others.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-xs font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs">{s.processingDays}</TableCell>
                    <TableCell className="text-xs font-semibold">{s.fee > 0 ? `₹${s.fee}` : "Free"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.requiredDocuments.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
