import { createFileRoute } from "@tanstack/react-router";
import { PremiumFlipBook } from "@/components/booklet/PremiumFlipBook";

export const Route = createFileRoute("/admin/booklet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin · Premium Booklet Preview — EI Solutions" },
      { name: "description", content: "Premium 3D flipbook preview with real company certifications and services." },
    ],
  }),
  component: PremiumFlipBook,
});
