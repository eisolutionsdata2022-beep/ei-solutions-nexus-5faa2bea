import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";

export const Route = createFileRoute("/trainer")({
  ssr: false,
  component: DashboardLayout,
});
