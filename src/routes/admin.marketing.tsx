import { createFileRoute } from "@tanstack/react-router";
import { MarketingMaterials } from "@/components/MarketingMaterials";

export const Route = createFileRoute("/admin/marketing")({
  ssr: false,
  component: MarketingMaterials,
});
