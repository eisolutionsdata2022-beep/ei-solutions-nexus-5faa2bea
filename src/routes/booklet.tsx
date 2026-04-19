import { createFileRoute } from "@tanstack/react-router";
import { CompanyBooklet } from "@/components/booklet/CompanyBooklet";

export const Route = createFileRoute("/booklet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EI SOLUTIONS — Digital Booklet | Franchise & Services" },
      { name: "description", content: "Premium digital booklet showcasing EI Solutions' services, registrations, earnings model, and franchise opportunity. 7+ years, 2500+ centers across India." },
      { property: "og:title", content: "EI SOLUTIONS — Premium Digital Booklet 2025" },
      { property: "og:description", content: "Page-flip booklet: services, earnings, software modules and franchise join process. Open & explore." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-booklet.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "EI SOLUTIONS — Premium Digital Booklet 2025" },
      { name: "twitter:description", content: "Premium 11-page flipbook: services, earnings, franchise join process." },
      { name: "twitter:image", content: "/og-booklet.jpg" },
    ],
  }),
  component: CompanyBooklet,
});
