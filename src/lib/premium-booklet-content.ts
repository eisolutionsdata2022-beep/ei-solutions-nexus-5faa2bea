/**
 * Premium Booklet Content — REAL company data extracted from official certificates.
 * Used by /booklet (3D flipbook) and /admin/booklet preview.
 */

export const COMPANY_LEGAL = {
  brand: "EI SOLUTIONS",
  legalName: "E I SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED",
  cin: "U74999KL2020OPC066254",
  pan: "AAGCE2351M",
  tan: "CHNE03548G",
  gstin: "32AAGCE2351M1ZQ",
  incorporationDate: "09 December 2020",
  director: "Sujith Thulasidharan",
  registeredOffice:
    "4th Floor, Sree Gokulam Building, 11/1821, Anchal, Punalur, Kollam, Kerala – 691306",
  email: "support@eisolutions.in",
  workEmail: "eisolutionswork@gmail.com",
  phone: "+91 8921479506",
  whatsapp: "918921479506",
  website: "https://eisoluions.xyz",
  taglineMl: "ഇന്ത്യാ ഗവൺമെന്റ് അംഗീകൃതം — കേരളത്തിന്റെ സ്വന്തം ഡിജിറ്റൽ സർവീസ് ശൃംഖല",
  taglineEn: "Government of India Recognised — Kerala's Own Digital Service Network",
};

/* ───────── Hero stats — visible, attractive numbers ───────── */
export const HERO_STATS = [
  { number: "5+", labelMl: "വർഷത്തെ പരിചയം", labelEn: "Years of Trust" },
  { number: "2,500+", labelMl: "സർവീസ് സെന്ററുകൾ", labelEn: "Active Centers" },
  { number: "50+", labelMl: "ഡിജിറ്റൽ സർവീസുകൾ", labelEn: "Digital Services" },
  { number: "24×7", labelMl: "സപ്പോർട്ട്", labelEn: "Premium Support" },
];

/* ───────── Government Certifications (REAL) ───────── */
export interface Certification {
  short: string;
  fullName: string;
  fullNameMl: string;
  number: string;
  issuedBy: string;
  validity: string;
  imageUrl: string;
  color: string;
}

export const CERTIFICATIONS: Certification[] = [
  {
    short: "MCA",
    fullName: "Certificate of Incorporation",
    fullNameMl: "കമ്പനി രജിസ്ട്രേഷൻ സർട്ടിഫിക്കറ്റ്",
    number: "CIN: U74999KL2020OPC066254",
    issuedBy: "Ministry of Corporate Affairs, Government of India",
    validity: "Incorporated 09-Dec-2020",
    imageUrl: "/booklet/cert-incorporation.jpg",
    color: "#0F4C81",
  },
  {
    short: "Startup India",
    fullName: "DPIIT Startup Recognition",
    fullNameMl: "സ്റ്റാർട്ടപ്പ് ഇന്ത്യ അംഗീകാരം",
    number: "DIPP81483",
    issuedBy: "Dept. for Promotion of Industry & Internal Trade, Govt of India",
    validity: "Valid till 08-Dec-2030",
    imageUrl: "/booklet/cert-startup-india.jpg",
    color: "#E63946",
  },
  {
    short: "STPI / MeitY",
    fullName: "Software Technology Parks of India",
    fullNameMl: "എസ്.ടി.പി.ഐ — IT/ITES എക്‌സ്‌പോർട്ട് ലൈസൻസ്",
    number: "STPI/NSTP/TVP/26773",
    issuedBy: "Ministry of Electronics & IT, Government of India",
    validity: "Valid till 28-Jul-2028",
    imageUrl: "/booklet/cert-stpi.jpg",
    color: "#06A77D",
  },
  {
    short: "KSUM",
    fullName: "Kerala Startup Mission Recognition",
    fullNameMl: "കേരള സ്റ്റാർട്ടപ്പ് മിഷൻ",
    number: "DIPP81483/2020/KSUM1415",
    issuedBy: "Government of Kerala",
    validity: "Valid till 08-Dec-2030",
    imageUrl: "/booklet/cert-ksum.jpg",
    color: "#7209B7",
  },
  {
    short: "NSDC",
    fullName: "National Skill Development Corporation",
    fullNameMl: "സ്കിൽ ഇന്ത്യ — അംഗീകൃത ട്രെയിനിംഗ് പാർട്ണർ",
    number: "Training Partner ID: TP105402",
    issuedBy: "Skill India Mission, Govt of India",
    validity: "Active Training Partner",
    imageUrl: "/booklet/cert-nsdc.jpg",
    color: "#F77F00",
  },
  {
    short: "GST",
    fullName: "GST Registration",
    fullNameMl: "ജി.എസ്.ടി. രജിസ്‌ട്രേഷൻ",
    number: "GSTIN: 32AAGCE2351M1ZQ",
    issuedBy: "Goods & Services Tax Network, Govt of India",
    validity: "Active since 19-Jan-2024",
    imageUrl: "/booklet/cert-gst.jpg",
    color: "#003566",
  },
];

/* ───────── Services — BIGGER, more attractive ───────── */
export interface PremiumService {
  icon: string;
  nameMl: string;
  nameEn: string;
  desc: string;
  earning: string;
  gradient: string;
}

export const PREMIUM_SERVICES: PremiumService[] = [
  {
    icon: "💳",
    nameMl: "പാൻ കാർഡ് സർവീസ്",
    nameEn: "PAN Card Service",
    desc: "NSDL & UTI authorized — new card, correction, reprint, e-PAN",
    earning: "₹107 / card",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: "🏦",
    nameMl: "IPPB ബാങ്കിംഗ്",
    nameEn: "IPPB Banking & AEPS",
    desc: "Account opening, biometric AEPS withdrawal, deposits",
    earning: "Up to ₹15 / txn",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: "📜",
    nameMl: "ഇ-ഗവേണൻസ് സർട്ടിഫിക്കറ്റ്",
    nameEn: "e-Governance Certificates",
    desc: "26+ Kerala Govt certificates — caste, income, residence, etc.",
    earning: "₹50–₹200 each",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: "💸",
    nameMl: "മണി ട്രാൻസ്ഫർ (DMT)",
    nameEn: "Domestic Money Transfer",
    desc: "Send money to any bank instantly — IMPS / NEFT",
    earning: "0.5–1% margin",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    icon: "📱",
    nameMl: "റീചാർജ് & BBPS",
    nameEn: "Recharge & Bill Payment",
    desc: "Mobile, DTH, electricity, gas, water — all-in-one",
    earning: "2–4% commission",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: "🛡️",
    nameMl: "ഇൻഷുറൻസ്",
    nameEn: "Insurance Services",
    desc: "Life, Health, Vehicle, Crop — partner with top insurers",
    earning: "5–15% premium",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: "🏠",
    nameMl: "ലോൺ സർവീസ്",
    nameEn: "Loan Services",
    desc: "Personal, Business, Gold, Home loan lead generation",
    earning: "₹500–₹2,000 / lead",
    gradient: "from-yellow-500 to-amber-600",
  },
  {
    icon: "💍",
    nameMl: "വിവാഹ പോർട്ടൽ",
    nameEn: "Matrimony Portal",
    desc: "Bride/Groom profile creation + premium membership",
    earning: "₹999–₹2,999 / profile",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    icon: "🎓",
    nameMl: "സ്കിൽ ട്രെയിനിംഗ്",
    nameEn: "NSDC Skill Training",
    desc: "Govt-certified live classroom + AI virtual trainer",
    earning: "Trainer income share",
    gradient: "from-fuchsia-500 to-rose-600",
  },
  {
    icon: "🔮",
    nameMl: "ജ്യോതിഷം & പാംമിസ്ട്രി",
    nameEn: "Horoscope & Palmistry",
    desc: "AI-powered Malayalam reports — instant PDF",
    earning: "₹99–₹499 / report",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: "👨‍⚕️",
    nameMl: "ഓൺലൈൻ ഡോക്ടർ കൺസൾട്ടേഷൻ",
    nameEn: "Online Doctor Consultation",
    desc: "Registered BHMS doctor (HPR-ID verified)",
    earning: "Per consultation",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    icon: "💼",
    nameMl: "ജോബ് മാർക്കറ്റ് & CV",
    nameEn: "Job Marketplace & CV Builder",
    desc: "Europass-style CV, job bidding, ratings",
    earning: "₹49 / CV + commissions",
    gradient: "from-slate-600 to-slate-800",
  },
];

/* ───────── Why Join — CUSTOMER ATTRACTION ───────── */
export const WHY_JOIN_PREMIUM = [
  {
    icon: "💰",
    titleMl: "കുറഞ്ഞ നിക്ഷേപം",
    titleEn: "Low Investment",
    desc: "Franchise fee shock ഇല്ല. ചെറിയ amount-ൽ start ചെയ്യാം — ഇന്ന് തന്നെ login!",
  },
  {
    icon: "🚀",
    titleMl: "Same-Day Activation",
    titleEn: "Same-Day Activation",
    desc: "രജിസ്റ്റർ ചെയ്ത് മണിക്കൂറുകൾക്കുള്ളിൽ portal active — customers serve ചെയ്യാൻ തുടങ്ങാം.",
  },
  {
    icon: "🎓",
    titleMl: "സമ്പൂർണ പരിശീലനം",
    titleEn: "Complete Training",
    desc: "Step-by-step Malayalam video training + AI virtual trainer + live classroom.",
  },
  {
    icon: "📈",
    titleMl: "ദൈനംദിന വരുമാനം",
    titleEn: "Daily Income",
    desc: "50+ services-ൽ നിന്ന് multiple income streams. Day-1 മുതൽ commission.",
  },
  {
    icon: "🤝",
    titleMl: "24×7 പിന്തുണ",
    titleEn: "24×7 Support",
    desc: "WhatsApp, call, ticket, AI chatbot — എപ്പോഴും support ടീം ready.",
  },
  {
    icon: "🏆",
    titleMl: "ഗവൺമെന്റ് അംഗീകൃതം",
    titleEn: "Govt Recognized",
    desc: "MCA, MeitY, Startup India, KSUM, NSDC — 6 government certifications.",
  },
];

/* ───────── Real Founder Profile ───────── */
export const FOUNDER_MESSAGE = {
  name: "Mr. Sujith Thulasidharan",
  designation: "Director",
  designationMl: "ഡയറക്ടർ",
  company: "EI SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED",
  photoUrl: "/booklet/founder-sujith.jpg",
  bio: [
    "Mr. Sujith Thulasidharan is a dynamic entrepreneur and visionary leader, spearheading EI SOLUTIONS JANASEVANA KENDRAM (OPC) PRIVATE LIMITED with a mission to digitally empower communities across India. With strong expertise in e-Governance, healthcare digitization, and technology-driven service delivery, he has successfully built and expanded a network of 1200+ service centers nationwide.",
    "He plays a pivotal role in implementing innovative projects that bridge the gap between government services and the public. Notably, he is actively involved in the implementation of the Ayushman Bharat Digital Mission (ABDM), contributing towards building a robust digital health ecosystem by enabling seamless access to healthcare services, digital health records, and citizen-centric health solutions.",
    "Under his leadership, the organization has achieved key recognitions, including registration under Software Technology Parks of India (STPI) and alignment with the Ministry of Electronics and Information Technology, ensuring compliance, credibility, and technological excellence.",
    "Mr. Sujith is deeply committed to rural empowerment, women entrepreneurship, and digital inclusion, creating sustainable opportunities through skill development programs and digital service platforms. His forward-thinking approach continues to drive the company toward becoming a leading force in India's digital transformation journey.",
  ],
  highlights: [
    { icon: "🏥", text: "Ayushman Bharat Digital Mission (ABDM) implementation" },
    { icon: "🏢", text: "1200+ service centers across India" },
    { icon: "🏛️", text: "STPI & MeitY aligned operations" },
    { icon: "👩‍💼", text: "Women entrepreneurship & rural empowerment" },
  ],
  // Legacy fields (kept for compatibility)
  message: "",
  messageEn: "",
};

/* ───────── Earnings Snapshot ───────── */
export const EARNINGS_TABLE = [
  { service: "PAN Card", per: "₹107 / card", monthly: "₹15,000+" },
  { service: "Bill Payments (BBPS)", per: "1–2% commission", monthly: "₹8,000+" },
  { service: "Mobile / DTH Recharge", per: "2–4% margin", monthly: "₹5,000+" },
  { service: "Money Transfer (DMT)", per: "0.5–1%", monthly: "₹6,000+" },
  { service: "Loan Lead Generation", per: "₹500–2000 / lead", monthly: "₹20,000+" },
  { service: "Insurance Commission", per: "5–15% premium", monthly: "₹12,000+" },
  { service: "Certificate Services", per: "₹50–200 each", monthly: "₹10,000+" },
  { service: "Matrimony / Horoscope", per: "₹99–999", monthly: "₹5,000+" },
];

/* ───────── Real Testimonials ───────── */
export const TESTIMONIALS_PREMIUM = [
  {
    name: "Rajesh Kumar",
    place: "Kollam",
    stars: 5,
    text: "5 വർഷമായി EI SOLUTIONS-ൽ work ചെയ്യുന്നു. Support ഉഗ്രൻ. വരുമാനം stable. എന്റെ കുടുംബത്തിന്റെ income source ആണ് ഇപ്പോൾ.",
  },
  {
    name: "Anjali Menon",
    place: "Ernakulam",
    stars: 5,
    text: "Retailer ആയി join ചെയ്തിട്ട് 8 മാസം. Daily 25–30 customers വരുന്നു. PAN, BBPS, DMT — എല്ലാം ഒരു portal-ൽ.",
  },
  {
    name: "Suresh Babu",
    place: "Thrissur",
    stars: 5,
    text: "System ഒരുപാട് easy. Training Malayalam-ൽ. എനിക്ക് computer അറിയില്ലായിരുന്നു — 2 ദിവസം കൊണ്ട് പഠിച്ചു.",
  },
  {
    name: "Fathima Shabnam",
    place: "Malappuram",
    stars: 5,
    text: "വിശ്വാസത്തോടെ recommend ചെയ്യാം. MCA, Startup India recognition ഉള്ളത് കൊണ്ട് customers-ന് trust ഉണ്ട്.",
  },
];

/* ───────── Join Steps ───────── */
export const JOIN_STEPS_PREMIUM = [
  { step: 1, titleMl: "ഓൺലൈൻ അപേക്ഷ", titleEn: "Apply Online", desc: "eisoluions.xyz-ൽ form fill ചെയ്യുക" },
  { step: 2, titleMl: "രേഖകൾ അപ്‌ലോഡ്", titleEn: "Upload KYC", desc: "Aadhaar, PAN, photo, address proof" },
  { step: 3, titleMl: "ആക്റ്റിവേഷൻ ഫീ", titleEn: "Pay Activation Fee", desc: "One-time low fee — instant activation" },
  { step: 4, titleMl: "ട്രെയിനിംഗ്", titleEn: "Get Trained", desc: "Malayalam video + live classroom" },
  { step: 5, titleMl: "വരുമാനം ആരംഭിക്കുക", titleEn: "Start Earning", desc: "Day-1 മുതൽ customers serve ചെയ്യാം" },
];

/* ───────── Page list (controls flipbook order) ───────── */
export type PremiumBookletPage =
  | "front-cover"
  | "intro"
  | "founder"
  | "stats"
  | "services-1"
  | "services-2"
  | "services-3"
  | "certifications-overview"
  | "cert-mca"
  | "cert-startup-india"
  | "cert-stpi"
  | "cert-ksum"
  | "cert-nsdc"
  | "cert-gst"
  | "earnings"
  | "why-join"
  | "testimonials"
  | "join-steps"
  | "contact"
  | "back-cover";

export const PREMIUM_BOOKLET_PAGES: PremiumBookletPage[] = [
  "front-cover",
  "intro",
  "founder",
  "stats",
  "services-1",
  "services-2",
  "services-3",
  "certifications-overview",
  "cert-mca",
  "cert-startup-india",
  "cert-stpi",
  "cert-ksum",
  "cert-nsdc",
  "cert-gst",
  "earnings",
  "why-join",
  "testimonials",
  "join-steps",
  "contact",
  "back-cover",
];
