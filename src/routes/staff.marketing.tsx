import { createFileRoute } from "@tanstack/react-router";
import { MarketingMaterials } from "@/components/MarketingMaterials";

export const Route = createFileRoute("/staff/marketing")({
  ssr: false,
  component: MarketingMaterials,
});
