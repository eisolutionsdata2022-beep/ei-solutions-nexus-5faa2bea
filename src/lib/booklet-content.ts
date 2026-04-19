// Premium Digital Booklet content for EI SOLUTIONS
// 12 pages — bilingual (Malayalam + English), professionally curated

export type BookletPage =
  | { kind: "cover" }
  | { kind: "intro" }
  | { kind: "registrations" }
  | { kind: "services" }
  | { kind: "earnings" }
  | { kind: "modules" }
  | { kind: "why-join" }
  | { kind: "reviews" }
  | { kind: "join" }
  | { kind: "contact" }
  | { kind: "back-cover" };

export const BOOKLET_PAGES: BookletPage[] = [
  { kind: "cover" },
  { kind: "intro" },
  { kind: "registrations" },
  { kind: "services" },
  { kind: "earnings" },
  { kind: "modules" },
  { kind: "why-join" },
  { kind: "reviews" },
  { kind: "join" },
  { kind: "contact" },
  { kind: "back-cover" },
];

export const COMPANY = {
  legalName: "EI SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED",
  brand: "EI SOLUTIONS",
  tagline: "കേരളത്തിൽ നിന്ന് ഇന്ത്യയിലേക്ക് വളർന്ന വിശ്വാസമുള്ള Digital Service Network",
  taglineEn: "A Trusted Digital Service Network growing from Kerala to all of India",
  phone: "+91 8921479506",
  whatsapp: "918921479506",
  email: "support@eisolutions.in",
  website: "https://eisoluions.xyz",
  address: "EI SOLUTIONS Janasevana Kendram (OPC) Pvt Ltd, Kerala, India",
};

export const STATS = [
  { number: "7+", label: "Years Experience", labelMl: "വർഷത്തെ പരിചയം" },
  { number: "2500+", label: "Active Centers", labelMl: "സർവീസ് സെന്ററുകൾ" },
  { number: "50+", label: "Digital Services", labelMl: "സേവനങ്ങൾ" },
  { number: "24×7", label: "Support", labelMl: "സപ്പോർട്ട്" },
];

export const REGISTRATIONS = [
  { name: "Ministry of Electronics & IT", short: "MeitY", color: "#0F4C81" },
  { name: "Kerala Startup Mission", short: "KSUM", color: "#E63946" },
  { name: "Skill India / NSDC", short: "NSDC", color: "#F77F00" },
  { name: "STPI Registered", short: "STPI", color: "#06A77D" },
  { name: "ABDM / Ayushman Bharat", short: "ABDM", color: "#118AB2" },
  { name: "Digital Bharat Mission", short: "DBM", color: "#7209B7" },
  { name: "Banking & Finance Network", short: "BBPS", color: "#003566" },
  { name: "Public Service Network", short: "PSN", color: "#9D0208" },
];

export const SERVICES = [
  { icon: "💳", name: "PAN Card Services", ml: "പാൻ കാർഡ് സേവനം" },
  { icon: "🧾", name: "Bill Payments (BBPS)", ml: "ബിൽ പേയ്മെന്റ്" },
  { icon: "💸", name: "Money Transfer (DMT)", ml: "മണി ട്രാൻസ്ഫർ" },
  { icon: "🛡️", name: "Insurance Services", ml: "ഇൻഷുറൻസ്" },
  { icon: "🏦", name: "Loan Services", ml: "ലോൺ സേവനം" },
  { icon: "💍", name: "Matrimony Portal", ml: "വിവാഹ പോർട്ടൽ" },
  { icon: "🎓", name: "Skill Training", ml: "സ്കിൽ ട്രെയിനിംഗ്" },
  { icon: "📜", name: "Government Certificates", ml: "സർട്ടിഫിക്കറ്റുകൾ" },
  { icon: "🏛️", name: "E-Governance Services", ml: "ഇ-ഗവേണൻസ്" },
  { icon: "🏪", name: "Digital Service Center Model", ml: "ഡിജിറ്റൽ സർവീസ് സെന്റർ" },
  { icon: "📱", name: "Mobile & DTH Recharge", ml: "റീചാർജ്" },
  { icon: "🤲", name: "Astrology & Palmistry", ml: "ജ്യോതിഷം" },
];

export const EARNINGS = [
  { service: "PAN Card Service", per: "₹107 / card", monthly: "₹15,000+" },
  { service: "Bill Payments", per: "1-2% commission", monthly: "₹8,000+" },
  { service: "Mobile Recharge", per: "2-4% margin", monthly: "₹5,000+" },
  { service: "Loan Lead Generation", per: "₹500-2000 / lead", monthly: "₹20,000+" },
  { service: "Insurance Commission", per: "5-15% premium", monthly: "₹12,000+" },
  { service: "Certificate Services", per: "₹50-200 / certificate", monthly: "₹10,000+" },
  { service: "Money Transfer", per: "0.5-1% commission", monthly: "₹6,000+" },
];

export const MODULES = [
  {
    name: "Janasevana Portal",
    ml: "ജനസേവന പോർട്ടൽ",
    desc: "Retailer dashboard, integrated wallet, all digital services in one place.",
    features: ["Wallet & Transactions", "Service Catalog", "Earnings Reports", "Customer Management"],
    color: "#0F4C81",
  },
  {
    name: "Matrimony Portal",
    ml: "വിവാഹ പോർട്ടൽ",
    desc: "Bride/Groom profiles, paid memberships, advanced search & matching.",
    features: ["Profile Creation", "Premium Memberships", "Smart Matching", "Privacy Controls"],
    color: "#E63946",
  },
  {
    name: "Finance Software",
    ml: "ഫിനാൻസ് സോഫ്റ്റ്‌വെയർ",
    desc: "Wallet, ledger, daily reports & complete business management.",
    features: ["Daily Cashbook", "GST Invoicing", "P&L Reports", "Multi-staff Access"],
    color: "#06A77D",
  },
];

export const WHY_JOIN = [
  { icon: "💰", title: "Low Investment", ml: "കുറഞ്ഞ നിക്ഷേപം", desc: "Start with minimal capital — no franchise fee shock." },
  { icon: "🚀", title: "Ready Portal Access", ml: "റെഡി പോർട്ടൽ", desc: "Login same day, start serving customers immediately." },
  { icon: "🎓", title: "Full Training", ml: "സമ്പൂർണ പരിശീലനം", desc: "Step-by-step video training in Malayalam + English." },
  { icon: "📈", title: "Daily Income", ml: "ദൈനംദിന വരുമാനം", desc: "Multiple revenue streams from day one." },
  { icon: "🤝", title: "Strong Support", ml: "ശക്തമായ പിന്തുണ", desc: "WhatsApp, call & ticket support 24×7." },
  { icon: "🏆", title: "Trusted Brand", ml: "വിശ്വസനീയം", desc: "7+ years, 2500+ centers, registered company." },
];

export const REVIEWS = [
  { stars: 5, name: "Rajesh Kumar", place: "Kollam", text: "ഞാൻ 5 വർഷമായി EI SOLUTIONS-ൽ work ചെയ്യുന്നു. നല്ല support ആണ്, വരുമാനവും stable ആണ്." },
  { stars: 5, name: "Anjali Menon", place: "Ernakulam", text: "Retailer ആയി join ചെയ്തിട്ട് 8 മാസം ആയി. Daily നല്ല income കിട്ടുന്നു, customers വരുന്നു." },
  { stars: 5, name: "Suresh Babu", place: "Thrissur", text: "System easy ആണ്, training ഉഗ്രൻ ആണ്. എല്ലാ services ഒരു portal-ൽ കിട്ടും." },
  { stars: 5, name: "Fathima Shabnam", place: "Malappuram", text: "Trust ഉള്ള company. വിശ്വാസത്തോടെ recommend ചെയ്യാം. Family-ന് മുഴുവൻ income source ആണ് ഇപ്പോൾ." },
];

export const JOIN_STEPS = [
  { step: 1, title: "Apply Online", ml: "ഓൺലൈൻ അപേക്ഷ", desc: "Fill the registration form on our portal." },
  { step: 2, title: "Submit Documents", ml: "രേഖകൾ സമർപ്പിക്കുക", desc: "Aadhaar, PAN, Photo, Address proof." },
  { step: 3, title: "Pay Activation Fee", ml: "ആക്റ്റിവേഷൻ ഫീ", desc: "One-time low activation fee." },
  { step: 4, title: "Get Trained", ml: "പരിശീലനം നേടുക", desc: "Complete the onboarding training." },
  { step: 5, title: "Start Earning", ml: "വരുമാനം ആരംഭിക്കുക", desc: "Login & serve customers from day one." },
];

export const REQUIRED_DOCS = ["Aadhaar Card", "PAN Card", "Passport Size Photo", "Address Proof", "Bank Account Details"];
