import { createFileRoute } from "@tanstack/react-router";
import { CRMReports } from "@/components/crm/CRMReports";

export const Route = createFileRoute("/staff/performance")({
  ssr: false,
  component: () => <CRMReports />,
});
