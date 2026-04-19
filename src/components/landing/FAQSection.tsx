import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Who is EI Solutions for?",
    a: "Anyone running or planning to run a Common Service Center (CSC) — retailers, agencies/distributors, trainers and back-office staff. We power small single-shop operators all the way to multi-state distributor networks.",
  },
  {
    q: "How long does setup take?",
    a: "Most retailers are live within 5 minutes — register, complete KYC, top up the wallet, and start transacting. Service-specific activations take an additional one-time admin approval.",
  },
  {
    q: "Is my money and customer data safe?",
    a: "Yes. We use Firebase Auth, Firestore security rules, AES-GCM encryption for sensitive credentials, HMAC-signed API requests, and atomic wallet transactions audited at every step.",
  },
  {
    q: "Do you support Malayalam?",
    a: "Absolutely. Critical screens, the AI Virtual Trainer, and horoscope/palmistry reports are Malayalam-first, with English available everywhere.",
  },
  {
    q: "Can I cancel or downgrade anytime?",
    a: "Yes. Plans are flexible and per-service activation lets you pay only for what you use. There is no lock-in or cancellation fee.",
  },
  {
    q: "Do you provide training and support?",
    a: "Every account includes a live multi-trainer studio, an AI assistant on every screen, and live human chat with our staff during business hours.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Questions, <span className="text-premium-gradient">answered</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-12 space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-border bg-card px-5 transition-colors hover:border-primary/40"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
