import { createFileRoute } from "@tanstack/react-router";
import { PremiumFlipBook } from "@/components/booklet/PremiumFlipBook";

export const Route = createFileRoute("/booklet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EI SOLUTIONS — Premium Digital Booklet | Govt Recognised" },
      { name: "description", content: "Premium 3D flipbook — 6 government certifications (MCA, MeitY, Startup India, KSUM, NSDC, GST), 50+ services, 2,500+ active centers. Malayalam edition." },
      { property: "og:title", content: "EI SOLUTIONS — Premium Digital Booklet 2026" },
      { property: "og:description", content: "Realistic page-flip booklet — services, earnings, government certifications, franchise join process." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-booklet.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "EI SOLUTIONS — Premium Digital Booklet 2026" },
      { name: "twitter:description", content: "20-page premium flipbook with real government certifications." },
      { name: "twitter:image", content: "/og-booklet.jpg" },
    ],
  }),
  component: PremiumFlipBook,
});
