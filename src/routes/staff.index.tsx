import { createFileRoute } from "@tanstack/react-router";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { UtiTrainingPdfCard } from "@/components/pan-portal/UtiTrainingPdfCard";

export const Route = createFileRoute("/staff/")({
  ssr: false,
  component: StaffHome,
});

function StaffHome() {
  return (
    <div className="space-y-8">
      {/* Quick reference — same UTI PAN training PDF retailers see */}
      <UtiTrainingPdfCard />
      <CRMDashboard />
    </div>
  );
}
