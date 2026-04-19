import { createFileRoute } from "@tanstack/react-router";
import { CompanyBooklet } from "@/components/booklet/CompanyBooklet";

export const Route = createFileRoute("/booklet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EI SOLUTIONS — Digital Booklet | Franchise & Services" },
      { name: "description", content: "Premium digital booklet showcasing EI Solutions' services, registrations, earnings model, and franchise opportunity. 7+ years, 2500+ centers across India." },
      { property: "og:title", content: "EI SOLUTIONS — Premium Digital Booklet" },
      { property: "og:description", content: "Page-flip booklet: services, earnings, software modules and franchise join process. Open & explore." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CompanyBooklet,
});
