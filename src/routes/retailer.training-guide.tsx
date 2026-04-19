import { createFileRoute } from "@tanstack/react-router";
import { FlipBookViewer } from "@/components/training-guide/FlipBookViewer";

export const Route = createFileRoute("/retailer/training-guide")({
  ssr: false,
  component: TrainingGuidePage,
});

function TrainingGuidePage() {
  return <FlipBookViewer />;
}
