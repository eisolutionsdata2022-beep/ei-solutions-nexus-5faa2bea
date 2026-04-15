import { createFileRoute } from "@tanstack/react-router";
import { LeadManagement } from "@/components/crm/LeadManagement";

export const Route = createFileRoute("/staff/leads")({
  ssr: false,
  component: LeadManagement,
});
