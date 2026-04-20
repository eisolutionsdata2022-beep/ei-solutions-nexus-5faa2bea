import { createFileRoute } from "@tanstack/react-router";
import { BulkCommPage } from "@/components/admin/BulkCommPage";

export const Route = createFileRoute("/admin/crm-bulk-comm")({
  ssr: false,
  component: BulkCommPage,
});
