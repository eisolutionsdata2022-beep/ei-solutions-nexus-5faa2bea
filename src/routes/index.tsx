import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/")({
  component: LandingPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "EI Solutions — India's Premium CSC Platform" },
      {
        name: "description",
        content:
          "All-in-one digital platform for CSC retailers — PAN, IPPB, e-Governance, recharge, money transfer, training and CRM. Built for India.",
      },
      { property: "og:title", content: "EI Solutions — India's Premium CSC Platform" },
      {
        property: "og:description",
        content:
          "Run a complete digital service center from one platform. Trusted by 5,000+ retailers across India.",
      },
    ],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <LandingHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <ServicesSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
