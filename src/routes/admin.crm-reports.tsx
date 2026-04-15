import { createFileRoute } from "@tanstack/react-router";
import { CRMReports } from "@/components/crm/CRMReports";

export const Route = createFileRoute("/admin/crm-reports")({
  ssr: false,
  component: CRMReports,
});
