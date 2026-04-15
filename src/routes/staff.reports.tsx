import { createFileRoute } from "@tanstack/react-router";
import { CRMReports } from "@/components/crm/CRMReports";

export const Route = createFileRoute("/staff/reports")({
  ssr: false,
  component: CRMReports,
});
