/**
 * Training Guide content — bilingual (Malayalam | English) chapters
 * for the Retailer Flipbook viewer.
 *
 * Each chapter is rendered as multiple book pages by the viewer.
 * Steps include: title, malayalam text, english text, tip, important note.
 */

import {
  Sparkles,
  LogIn,
  User,
  Wallet,
  Building2,
  Heart,
  CreditCard,
  Smartphone,
  ShieldCheck,
  Briefcase,
  Banknote,
  GraduationCap,
  FileText,
  HelpCircle,
  BookOpen,
  Award,
  Clock,
  Receipt,
  Coins,
  ClipboardList,
  Image as ImageIcon,
  Users,
  Gift,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";

export interface GuideStep {
  /** Optional icon for the step (Lucide). */
  icon?: LucideIcon;
  /** Step heading in Malayalam */
  ml: string;
  /** Step heading in English */
  en: string;
  /** Optional tip (shown in green callout) — bilingual joined by " · " */
  tip?: string;
  /** Optional important note (shown in amber callout) */
  note?: string;
}

export interface GuideChapter {
  /** Chapter number (auto-assigned by index but kept for reference) */
  number: number;
  /** Title (Malayalam) */
  titleMl: string;
  /** Title (English) */
  titleEn: string;
  /** Subtitle / one-line summary */
  subtitleMl: string;
  subtitleEn: string;
  /** Theme color token from styles.css (CSS variable name without --). */
  themeColor: string;
  /** Lucide icon for the chapter cover */
  icon: LucideIcon;
  /** Steps shown inside the chapter (one or more pages). */
  steps: GuideStep[];
  /** Required documents list (optional) */
  documents?: string[];
  /** Charges / commission (optional) */
  charges?: string;
  /** Approval / processing time (optional) */
  approvalTime?: string;
  /** Common errors & solutions (optional) */
  errors?: { problem: string; solution: string }[];
  /** Future / coming-soon flag */
  comingSoon?: boolean;
}

export const GUIDE_CHAPTERS: GuideChapter[] = [
  // ─────────── Chapter 1 — Welcome ───────────
  {
    number: 1,
    titleMl: "സ്വാഗതം",
    titleEn: "Welcome",
    subtitleMl: "EI SOLUTIONS പോർട്ടലിലേക്ക് സ്വാഗതം",
    subtitleEn: "Welcome to the EI SOLUTIONS Portal",
    themeColor: "primary",
    icon: BookOpen,
    steps: [
      {
        icon: Sparkles,
        ml: "EI SOLUTIONS — ഡിജിറ്റൽ ഇന്ത്യ ഫ്രാഞ്ചൈസി പങ്കാളി",
        en: "EI SOLUTIONS — Digital India Franchise Partner",
        tip: "ഈ ഗൈഡ് നിങ്ങളെ portal-ലെ എല്ലാ services-ഉം step by step പഠിപ്പിക്കും.",
      },
      {
        icon: BookOpen,
        ml: "ഈ പുസ്തകം എങ്ങനെ വായിക്കാം",
        en: "How to read this book",
        tip: "Next / Previous buttons ഉപയോഗിച്ച് pages മാറ്റാം. ഇടത് വശം മലയാളം, വലത് വശം English.",
      },
      {
        icon: Award,
        ml: "ഈ guide വായിച്ചതിന് ശേഷം നിങ്ങൾക്ക് customer-മാർക്ക് എല്ലാ services-ഉം നൽകാൻ കഴിയും.",
        en: "After completing this guide, you will be able to deliver every service to your customers confidently.",
        note: "Print എടുത്ത് counter-ൽ വയ്ക്കാം — reference-നായി.",
      },
    ],
  },

  // ─────────── Chapter 2 — Login ───────────
  {
    number: 2,
    titleMl: "ലോഗിൻ ഗൈഡ്",
    titleEn: "Login Guide",
    subtitleMl: "Portal-ലേക്ക് എങ്ങനെ login ചെയ്യാം",
    subtitleEn: "How to log in to the portal",
    themeColor: "gov-blue",
    icon: LogIn,
    steps: [
      {
        icon: LogIn,
        ml: "Browser-ൽ www.eisoluions.xyz തുറക്കുക",
        en: "Open www.eisoluions.xyz in your browser",
        tip: "Mobile browser-ലും ഇത് perfect ആയി പ്രവർത്തിക്കും.",
      },
      {
        icon: User,
        ml: "നിങ്ങളുടെ Email / User ID + Password നൽകുക",
        en: "Enter your Email / User ID and Password",
        note: "Password മറ്റാർക്കും കൊടുക്കരുത്. Staff-ന് വേണ്ടി sub-account create ചെയ്യുക.",
      },
      {
        icon: ShieldCheck,
        ml: "\"Login\" button click ചെയ്യുക — Dashboard തുറക്കും",
        en: "Click the \"Login\" button — your dashboard will open",
        tip: "First login-ന് ശേഷം KYC submit ചെയ്യേണ്ടത് നിർബന്ധമാണ്.",
      },
      {
        icon: HelpCircle,
        ml: "Password മറന്നുപോയോ? \"Forgot Password\" ക്ലിക്ക് ചെയ്യുക, email-ൽ link വരും.",
        en: "Forgot Password? Click \"Forgot Password\" and check your email for a reset link.",
        note: "Reset link 1 hour-ന് ശേഷം expire ആകും.",
      },
    ],
    errors: [
      { problem: "\"Invalid credentials\" എന്ന് കാണിക്കുന്നു", solution: "Email & password വീണ്ടും check ചെയ്യുക. Caps Lock off ആണെന്ന് ഉറപ്പാക്കുക." },
      { problem: "Login ചെയ്ത ശേഷം blank page", solution: "Browser refresh ചെയ്യുക (F5). പിന്നെയും problem-ഉണ്ടെങ്കിൽ admin-നെ contact ചെയ്യുക." },
    ],
  },

  // ─────────── Chapter 3 — Profile & KYC ───────────
  {
    number: 3,
    titleMl: "പ്രൊഫൈൽ & KYC",
    titleEn: "Profile & KYC",
    subtitleMl: "Profile update, KYC submit, certificate download",
    subtitleEn: "Update profile, submit KYC, download certificate",
    themeColor: "gov-saffron",
    icon: User,
    steps: [
      {
        icon: User,
        ml: "Sidebar-ൽ \"Profile\" ക്ലിക്ക് ചെയ്യുക",
        en: "Click \"Profile\" in the sidebar",
        tip: "നിങ്ങളുടെ VLE ID + KYC status ഇവിടെ കാണാം.",
      },
      {
        icon: FileText,
        ml: "Name, Address, Photo, Phone — ഇവ edit ചെയ്യാം. Save click ചെയ്യുക.",
        en: "Edit Name, Address, Photo, Phone — then click Save.",
        note: "എല്ലാ edits-ഉം admin audit log-ൽ record ആകും.",
      },
      {
        icon: ShieldCheck,
        ml: "KYC submit / re-submit: Aadhaar, PAN, Bank passbook, Photo upload ചെയ്യുക.",
        en: "KYC submit / re-submit: upload Aadhaar, PAN, Bank passbook and Photo.",
        tip: "Approval-ന് സാധാരണ 24–48 hours എടുക്കും.",
      },
      {
        icon: Award,
        ml: "Approval ലഭിച്ച ശേഷം — Franchise Certificate + VLE ID Card download ചെയ്യാം.",
        en: "After approval — download your Franchise Certificate + VLE ID Card.",
        tip: "Certificate counter-ൽ display ചെയ്യുന്നത് customer trust വർദ്ധിപ്പിക്കും.",
      },
      {
        icon: ShieldCheck,
        ml: "Password Change: Profile → Security → New password type ചെയ്ത് Save.",
        en: "Password Change: Profile → Security → enter a new password and Save.",
      },
    ],
    documents: ["Aadhaar Card", "PAN Card", "Bank Passbook / Cancelled cheque", "Recent passport photo", "Shop address proof"],
    approvalTime: "24–48 hours",
  },

  // ─────────── Chapter 4 — Wallet ───────────
  {
    number: 4,
    titleMl: "Wallet & Fund",
    titleEn: "Wallet & Fund",
    subtitleMl: "Fund add, balance check, transactions",
    subtitleEn: "Add funds, check balance, view transactions",
    themeColor: "gov-green",
    icon: Wallet,
    steps: [
      {
        icon: Wallet,
        ml: "Sidebar → \"My Wallet\" തുറക്കുക",
        en: "Open Sidebar → \"My Wallet\"",
        tip: "Dashboard top card-ലും balance live ആയി കാണാം.",
      },
      {
        icon: Banknote,
        ml: "\"Add Money\" click ചെയ്യുക → Paytm QR scan ചെയ്ത് amount pay ചെയ്യുക",
        en: "Click \"Add Money\" → scan the Paytm QR and pay the amount",
        note: "Payment ശേഷം transaction ID copy ചെയ്ത് form-ൽ submit ചെയ്യുക.",
      },
      {
        icon: Clock,
        ml: "Admin approval-ന് ശേഷം wallet-ൽ amount credit ആകും (15 minutes – 2 hours)",
        en: "After admin approval, the amount is credited to your wallet (15 minutes – 2 hours)",
      },
      {
        icon: FileText,
        ml: "\"Transactions\" tab-ൽ എല്ലാ debit/credit history കാണാം. Filter ഉപയോഗിച്ച് search ചെയ്യാം.",
        en: "View all debit/credit history under \"Transactions\". Use filters to search.",
      },
      {
        icon: Award,
        ml: "Commission view: ഓരോ service കഴിയുമ്പോളും earned commission auto credit ആകും.",
        en: "Commission view: earned commission is auto-credited after each completed service.",
      },
    ],
    errors: [
      { problem: "Add Money request pending ആയി തുടരുന്നു", solution: "Transaction ID + screenshot WhatsApp വഴി admin-ന് അയക്കുക." },
      { problem: "Wallet balance insufficient", solution: "Service ചെയ്യും മുമ്പ് Add Money request submit ചെയ്യുക." },
    ],
  },

  // ─────────── Chapter 5 — E-District ───────────
  {
    number: 5,
    titleMl: "E-District സർവീസുകൾ",
    titleEn: "E-District Services",
    subtitleMl: "26+ government certificates",
    subtitleEn: "26+ government certificates",
    themeColor: "primary",
    icon: Building2,
    steps: [
      {
        icon: Building2,
        ml: "Sidebar → \"E-dis\" തുറക്കുക. Certificate type select ചെയ്യുക (Income, Caste, Residence, etc.)",
        en: "Open Sidebar → \"E-dis\". Select certificate type (Income, Caste, Residence, etc.)",
      },
      {
        icon: FileText,
        ml: "Multi-step form fill ചെയ്യുക: Personal → Address → Details → Documents",
        en: "Fill the multi-step form: Personal → Address → Details → Documents",
        tip: "ഓരോ step-ലും save auto ആകും — refresh ചെയ്താലും data നഷ്ടപ്പെടില്ല.",
      },
      {
        icon: ShieldCheck,
        ml: "Required documents upload ചെയ്യുക (Aadhaar, ration card, photo etc.)",
        en: "Upload the required documents (Aadhaar, ration card, photo, etc.)",
      },
      {
        icon: CreditCard,
        ml: "Service fee wallet-ൽ നിന്ന് auto-deduct ആകും. Submit click ചെയ്യുക.",
        en: "The service fee is auto-deducted from your wallet. Click Submit.",
      },
      {
        icon: Clock,
        ml: "Status check: \"My Applications\" → application card-ൽ progress കാണാം. Approve ആയാൽ certificate download ചെയ്യാം.",
        en: "Status check: open \"My Applications\" — see progress on each card. Once approved, download the certificate.",
      },
    ],
    documents: ["Customer Aadhaar", "Ration Card", "Recent photo", "Income proof (if applicable)", "Existing certificate (for renewal)"],
    charges: "₹30 – ₹150 (certificate type അനുസരിച്ച്)",
    approvalTime: "3–10 working days",
    errors: [
      { problem: "Document upload fail ആകുന്നു", solution: "File size 2MB-ൽ താഴെ ആകണം. JPG/PDF format use ചെയ്യുക." },
      { problem: "Application reject ആയി", solution: "Reason \"My Applications\"-ൽ കാണാം. Documents fix ചെയ്ത് re-submit ചെയ്യുക. Refund auto credit ആകും." },
    ],
  },

  // ─────────── Chapter 6 — Matrimony ───────────
  {
    number: 6,
    titleMl: "Matrimony സർവീസുകൾ",
    titleEn: "Matrimony Services",
    subtitleMl: "Profile create, search, contact",
    subtitleEn: "Create profile, search, contact requests",
    themeColor: "gov-saffron",
    icon: Heart,
    steps: [
      {
        icon: Heart,
        ml: "Sidebar → \"Matrimony\" തുറക്കുക",
        en: "Open Sidebar → \"Matrimony\"",
      },
      {
        icon: User,
        ml: "\"Create Profile\" → Customer details, photo, horoscope info നൽകുക",
        en: "Click \"Create Profile\" — enter customer details, photo, horoscope info",
        tip: "Photo clear ആയിരിക്കണം — match chance വർദ്ധിക്കും.",
      },
      {
        icon: Sparkles,
        ml: "Search Profile: filters ഉപയോഗിച്ച് suitable match കണ്ടെത്താം",
        en: "Search Profile: use filters to find suitable matches",
      },
      {
        icon: ShieldCheck,
        ml: "Contact Request: interested profile-ൽ \"Express Interest\" click ചെയ്യുക. Match accept ചെയ്താൽ contact info reveal ആകും.",
        en: "Contact Request: click \"Express Interest\" on a profile. Once accepted, contact info is revealed.",
      },
      {
        icon: Award,
        ml: "Membership Upgrade: Premium plan വാങ്ങിയാൽ unlimited contact + priority listing ലഭിക്കും.",
        en: "Membership Upgrade: a Premium plan gives unlimited contacts + priority listing.",
      },
    ],
    charges: "Profile create: Free · Premium: ₹999 / 6 months",
    approvalTime: "Profile activation: instant",
  },

  // ─────────── Chapter 7 — PAN Card ───────────
  {
    number: 7,
    titleMl: "PAN Card സർവീസുകൾ",
    titleEn: "PAN Card Services",
    subtitleMl: "New PAN, Correction, PSA Create",
    subtitleEn: "New PAN, Correction, PSA Create",
    themeColor: "gov-blue",
    icon: CreditCard,
    steps: [
      {
        icon: CreditCard,
        ml: "Sidebar → \"PAN Portal\" തുറക്കുക. Dashboard-ൽ VLE ID display ചെയ്തിരിക്കുന്നു — copy button click ചെയ്യാം.",
        en: "Open Sidebar → \"PAN Portal\". Your VLE ID is shown on the dashboard — click to copy.",
        tip: "ഈ VLE ID എല്ലാ PAN portal services-ലും automatically use ചെയ്യപ്പെടും.",
      },
      {
        icon: User,
        ml: "PSA Create: \"PSA Create\" service select ചെയ്യുക → form-ൽ VLE ID auto-fill ആയിരിക്കും",
        en: "PSA Create: select the \"PSA Create\" service — your VLE ID auto-fills the form",
      },
      {
        icon: FileText,
        ml: "New PAN Apply: Customer details + Aadhaar / DOB enter ചെയ്യുക. Photo + signature upload.",
        en: "New PAN Apply: enter customer details + Aadhaar / DOB, then upload photo + signature.",
      },
      {
        icon: ShieldCheck,
        ml: "Correction PAN: Existing PAN number + correction field select ചെയ്ത് new value enter ചെയ്യുക.",
        en: "Correction PAN: enter existing PAN + select the field to correct, then enter the new value.",
      },
      {
        icon: Clock,
        ml: "Tracking: \"My Applications\" → 15-digit acknowledgment number ഉപയോഗിച്ച് status check ചെയ്യുക.",
        en: "Tracking: in \"My Applications\", check status with the 15-digit acknowledgment number.",
      },
    ],
    documents: ["Customer Aadhaar", "DOB proof", "Photo (passport size)", "Signature on white paper", "Existing PAN (for correction)"],
    charges: "New PAN: ₹107 · Correction: ₹107 · PSA Create: ₹500 (one-time)",
    approvalTime: "e-PAN: 5–10 days · Physical PAN: 15–20 days",
  },

  // ─────────── Chapter 8 — Recharge / Bills ───────────
  {
    number: 8,
    titleMl: "Recharge / Bill Payment",
    titleEn: "Recharge / Bill Payment",
    subtitleMl: "Mobile, DTH, Electricity, Gas, Water bills",
    subtitleEn: "Mobile, DTH, Electricity, Gas, Water bills",
    themeColor: "gov-green",
    icon: Smartphone,
    steps: [
      {
        icon: Smartphone,
        ml: "Sidebar → \"Recharge & BBPS\" തുറക്കുക. Service type select ചെയ്യുക (Mobile / DTH / BBPS).",
        en: "Open Sidebar → \"Recharge & BBPS\". Select the service type (Mobile / DTH / BBPS).",
      },
      {
        icon: User,
        ml: "Customer mobile number / consumer ID + operator + amount enter ചെയ്യുക",
        en: "Enter customer mobile / consumer ID + operator + amount",
        tip: "BBPS bills-ൽ \"Fetch Bill\" click ചെയ്താൽ amount auto come ആകും.",
      },
      {
        icon: ShieldCheck,
        ml: "Submit: 2-minute duplicate check auto run ആകും — അതേ amount-ഉം number-ഉം 2 min-നുള്ളിൽ submit ചെയ്താൽ block ചെയ്യും",
        en: "Submit: a 2-minute duplicate check runs automatically — repeat with same number + amount within 2 min is blocked",
      },
      {
        icon: CreditCard,
        ml: "Wallet-ൽ നിന്ന് amount auto-deduct. Recharge success ആയാൽ commission credit ആകും.",
        en: "Amount is auto-deducted from wallet. On success, commission is credited.",
      },
      {
        icon: FileText,
        ml: "Receipt: Transaction-ൽ \"Download Receipt\" click ചെയ്യുക. Customer-ന് WhatsApp / print വഴി കൊടുക്കാം.",
        en: "Receipt: click \"Download Receipt\" on the transaction. Share via WhatsApp / print for the customer.",
      },
    ],
    charges: "Commission: 1–4% (operator അനുസരിച്ച്)",
    approvalTime: "Recharge: instant · Bill payment: 1–24 hours",
    errors: [
      { problem: "Recharge fail ആയി, amount deduct ആയോ?", solution: "Amount 24 hours-നുള്ളിൽ auto refund ആകും. Transaction status \"Failed\" ആകുമ്പോൾ refund record show ആകും." },
      { problem: "OTP customer-ന് കിട്ടുന്നില്ല", solution: "Customer mobile number recheck ചെയ്യുക. SMS box check ചെയ്യാൻ പറയുക." },
    ],
  },

  // ─────────── Chapter 9 — Money Transfer (DMT) ───────────
  {
    number: 9,
    titleMl: "Money Transfer (DMT)",
    titleEn: "Money Transfer (DMT)",
    subtitleMl: "Bank-to-bank money transfer service",
    subtitleEn: "Bank-to-bank money transfer service",
    themeColor: "primary",
    icon: Banknote,
    steps: [
      {
        icon: Banknote,
        ml: "Sidebar → \"Money Transfer (DMT)\" തുറക്കുക",
        en: "Open Sidebar → \"Money Transfer (DMT)\"",
      },
      {
        icon: User,
        ml: "Customer mobile number enter ചെയ്യുക → OTP verify",
        en: "Enter customer mobile number → verify OTP",
        note: "Customer registration ഒരു തവണ മാത്രം മതി — പിന്നീട് reuse ചെയ്യാം.",
      },
      {
        icon: CreditCard,
        ml: "Beneficiary bank account + IFSC + name നൽകി \"Verify\" click ചെയ്യുക (penny drop)",
        en: "Enter beneficiary account + IFSC + name → click \"Verify\" (penny drop check)",
      },
      {
        icon: ShieldCheck,
        ml: "Amount enter ചെയ്യുക → IMPS / NEFT select → Submit",
        en: "Enter amount → select IMPS / NEFT → Submit",
        tip: "IMPS instant, NEFT 2 hours-നുള്ളിൽ.",
      },
      {
        icon: FileText,
        ml: "Receipt download ചെയ്ത് customer-ന് give ചെയ്യുക",
        en: "Download the receipt and give it to the customer",
      },
    ],
    charges: "₹10 – ₹25 per transaction · Commission: 0.4–0.6%",
    approvalTime: "IMPS: instant · NEFT: 2 hours",
  },

  // ─────────── Chapter 10 — IPPB ───────────
  {
    number: 10,
    titleMl: "IPPB Account സർവീസുകൾ",
    titleEn: "IPPB Account Services",
    subtitleMl: "India Post Payments Bank account opening",
    subtitleEn: "India Post Payments Bank account opening",
    themeColor: "gov-saffron",
    icon: Banknote,
    steps: [
      {
        icon: Banknote,
        ml: "Sidebar → \"IPPB Account\" തുറക്കുക. Available turn lock confirm ചെയ്യുക.",
        en: "Open Sidebar → \"IPPB Account\". Confirm the available turn lock.",
        tip: "ഒരേ സമയം ഒരു customer-ന് മാത്രം process ചെയ്യാൻ കഴിയും.",
      },
      {
        icon: User,
        ml: "Customer details: Aadhaar, PAN, Mobile, Address fill ചെയ്യുക",
        en: "Customer details: fill Aadhaar, PAN, Mobile, Address",
      },
      {
        icon: ShieldCheck,
        ml: "Biometric capture (Aadhaar fingerprint) — RD service device connect ചെയ്തിരിക്കണം",
        en: "Capture biometric (Aadhaar fingerprint) — the RD service device must be connected",
        note: "Remote capture ഉം available ആണ് — staff-ന് PC agent വഴി capture ചെയ്യാൻ കഴിയും.",
      },
      {
        icon: Award,
        ml: "Submit ചെയ്താൽ account number instant generate ആകും. Welcome kit customer-ന് print എടുത്ത് കൊടുക്കുക.",
        en: "On submit, the account number is generated instantly. Print the welcome kit for the customer.",
      },
    ],
    documents: ["Customer Aadhaar", "PAN", "Active mobile number"],
    charges: "Commission: ₹50 per account",
    approvalTime: "Account: instant",
  },

  // ─────────── Chapter 11 — EI SOLUTIONS PAY (CSC) ───────────
  {
    number: 11,
    titleMl: "EI SOLUTIONS PAY",
    titleEn: "EI SOLUTIONS PAY",
    subtitleMl: "CSC services — Aadhaar, ePAN, more",
    subtitleEn: "CSC services — Aadhaar, ePAN, and more",
    themeColor: "gov-blue",
    icon: ShieldCheck,
    steps: [
      {
        icon: ShieldCheck,
        ml: "Sidebar → \"EI SOLUTIONS PAY\" തുറക്കുക. Service catalog browse ചെയ്യുക.",
        en: "Open Sidebar → \"EI SOLUTIONS PAY\". Browse the service catalog.",
      },
      {
        icon: FileText,
        ml: "Service select ചെയ്യുക → Customer details + required fields fill ചെയ്യുക",
        en: "Select a service → fill customer details + required fields",
      },
      {
        icon: CreditCard,
        ml: "Wallet balance check ചെയ്യും → fee deduct → request submit",
        en: "Wallet balance is checked → fee deducted → request submitted",
      },
      {
        icon: Clock,
        ml: "Status: \"Activations Log\"-ൽ result + receipt കാണാം",
        en: "Status: see the result + receipt in \"Activations Log\"",
      },
    ],
    charges: "Service-അനുസരിച്ച് ₹20 – ₹500",
    approvalTime: "Mostly instant",
  },

  // ─────────── Chapter 12 — Horoscope ───────────
  {
    number: 12,
    titleMl: "Horoscope സർവീസ്",
    titleEn: "Horoscope Service",
    subtitleMl: "Birth chart, predictions, premium reports",
    subtitleEn: "Birth chart, predictions, premium reports",
    themeColor: "gov-saffron",
    icon: Sparkles,
    steps: [
      {
        icon: Sparkles,
        ml: "Sidebar → \"Horoscope\" തുറക്കുക",
        en: "Open Sidebar → \"Horoscope\"",
      },
      {
        icon: User,
        ml: "Customer name, DOB, time of birth, place enter ചെയ്യുക",
        en: "Enter customer name, DOB, time of birth, place",
        tip: "Birth time accurate ആയിരിക്കണം — predictions accuracy അതിനെ depend ചെയ്യും.",
      },
      {
        icon: FileText,
        ml: "Report type select ചെയ്യുക: Basic / Premium",
        en: "Select report type: Basic / Premium",
      },
      {
        icon: Award,
        ml: "PDF generate ആകും → download / print ചെയ്ത് customer-ന് കൊടുക്കുക",
        en: "PDF is generated → download / print and give to the customer",
      },
    ],
    charges: "Basic: ₹50 · Premium: ₹250",
    approvalTime: "Instant",
  },

  // ─────────── Chapter 13 — CV Builder ───────────
  {
    number: 13,
    titleMl: "CV Builder",
    titleEn: "CV Builder",
    subtitleMl: "Europass-style professional CV",
    subtitleEn: "Europass-style professional CV",
    themeColor: "gov-green",
    icon: FileText,
    steps: [
      {
        icon: FileText,
        ml: "Sidebar → \"CV Builder\" തുറക്കുക",
        en: "Open Sidebar → \"CV Builder\"",
      },
      {
        icon: User,
        ml: "6-step wizard fill ചെയ്യുക: Personal → Education → Experience → Skills → Languages → Photo",
        en: "Fill the 6-step wizard: Personal → Education → Experience → Skills → Languages → Photo",
      },
      {
        icon: Sparkles,
        ml: "Template select ചെയ്യുക (multiple designs available)",
        en: "Select a template (multiple designs available)",
      },
      {
        icon: Award,
        ml: "Preview check ചെയ്യുക → PDF download → customer-ന് നൽകുക",
        en: "Check preview → download PDF → deliver to the customer",
      },
    ],
    charges: "₹100 per CV",
    approvalTime: "Instant",
  },

  // ─────────── Chapter 14 — Job Marketplace ───────────
  {
    number: 14,
    titleMl: "Job Marketplace",
    titleEn: "Job Marketplace",
    subtitleMl: "Local jobs post & apply",
    subtitleEn: "Post and apply for local jobs",
    themeColor: "primary",
    icon: Briefcase,
    steps: [
      {
        icon: Briefcase,
        ml: "Sidebar → \"Job Marketplace\" തുറക്കുക",
        en: "Open Sidebar → \"Job Marketplace\"",
      },
      {
        icon: FileText,
        ml: "Job post: \"Post a Job\" → title, description, payment, location enter ചെയ്യുക",
        en: "Job post: click \"Post a Job\" → enter title, description, payment, location",
      },
      {
        icon: User,
        ml: "Worker apply ചെയ്യും. Best worker select → assign ചെയ്യുക.",
        en: "Workers apply. Select the best one → assign.",
      },
      {
        icon: Award,
        ml: "Job complete ആയ ശേഷം rating + payment release ചെയ്യുക",
        en: "After job completion, give a rating + release payment",
      },
    ],
    charges: "Platform fee: 5%",
  },

  // ─────────── Chapter 15 — Trainings ───────────
  {
    number: 15,
    titleMl: "Trainings",
    titleEn: "Trainings",
    subtitleMl: "Live sessions + Virtual Trainer",
    subtitleEn: "Live sessions + Virtual Trainer",
    themeColor: "gov-blue",
    icon: GraduationCap,
    steps: [
      {
        icon: GraduationCap,
        ml: "Sidebar → \"Trainings\" — upcoming sessions browse ചെയ്യുക",
        en: "Sidebar → \"Trainings\" — browse upcoming sessions",
      },
      {
        icon: User,
        ml: "Session register ചെയ്യുക. Wallet-ൽ fee deduct ആകും.",
        en: "Register for a session. Fee is deducted from wallet.",
      },
      {
        icon: Sparkles,
        ml: "Live time-ൽ join ചെയ്യുക. Avatar / Camera mode select ചെയ്യാം.",
        en: "Join live at the scheduled time. Choose Avatar / Camera mode.",
      },
      {
        icon: Award,
        ml: "Session കഴിഞ്ഞ ശേഷം review submit ചെയ്യുക → trainer-നു rating give ചെയ്യാം.",
        en: "After the session, submit a review → rate the trainer.",
      },
      {
        icon: Sparkles,
        ml: "Virtual Trainer (എൽസുതത്താ): Malayalam AI assistant — സർവീസ് doubts തീർക്കാൻ 24/7 available",
        en: "Virtual Trainer (Elzu): Malayalam AI assistant — available 24/7 to clear service doubts",
      },
    ],
    charges: "Live: ₹100 – ₹500 / session · Virtual Trainer: ₹20 / session",
  },

  // ─────────── Chapter 16 — Bill Payment (BBPS) ───────────
  {
    number: 16,
    titleMl: "Bill Payment (BBPS)",
    titleEn: "Bill Payment (BBPS)",
    subtitleMl: "Bharat Connect — Electricity, Water, Gas, Insurance",
    subtitleEn: "Bharat Connect — Electricity, Water, Gas, Insurance bills",
    themeColor: "gov-blue",
    icon: Receipt,
    steps: [
      {
        icon: Receipt,
        ml: "Sidebar → \"Bill Payment\" തുറക്കുക. Category select ചെയ്യുക (Electricity / Gas / Water / Insurance / Loan EMI etc.)",
        en: "Open Sidebar → \"Bill Payment\". Select category (Electricity / Gas / Water / Insurance / Loan EMI, etc.)",
      },
      {
        icon: Building2,
        ml: "Biller select ചെയ്യുക. Customer-ന്റെ consumer number / connection ID enter ചെയ്യുക.",
        en: "Select the biller. Enter the customer's consumer number / connection ID.",
      },
      {
        icon: Sparkles,
        ml: "\"Fetch Bill\" click ചെയ്യുക → bill amount, due date, customer name auto-display ആകും",
        en: "Click \"Fetch Bill\" → bill amount, due date, customer name auto-populate",
        tip: "Customer-ന്റെ details verify ചെയ്ത് അവർക്ക് കാണിച്ച് confirm വാങ്ങുക.",
      },
      {
        icon: CreditCard,
        ml: "\"Pay Now\" click ചെയ്യുക. Wallet-ൽ നിന്ന് amount + service fee deduct ആകും.",
        en: "Click \"Pay Now\". Amount + service fee is deducted from wallet.",
      },
      {
        icon: FileText,
        ml: "Receipt download ചെയ്യുക — Bharat Connect logo-ഉം transaction reference-ഉം include ചെയ്തിരിക്കും.",
        en: "Download the receipt — includes the Bharat Connect logo and transaction reference.",
        note: "Receipt customer-ന് WhatsApp / print വഴി കൊടുക്കുക. Future complaint-നായി reference number save ചെയ്യുക.",
      },
    ],
    charges: "Service fee: ₹5 – ₹15 (category അനുസരിച്ച്)",
    approvalTime: "Instant (most billers)",
    errors: [
      { problem: "\"Bill not found\" error", solution: "Consumer number recheck ചെയ്യുക. Some billers-നു bill generate ആകാൻ കുറച്ച് സമയം എടുക്കും." },
      { problem: "Payment processing-ൽ stuck", solution: "30 minutes wait ചെയ്യുക. Status \"Failed\" ആയാൽ refund auto credit ആകും." },
    ],
  },

  // ─────────── Chapter 17 — Finance Portal ───────────
  {
    number: 17,
    titleMl: "Finance Portal",
    titleEn: "Finance Portal",
    subtitleMl: "Gold loans, deposits, branch operations",
    subtitleEn: "Gold loans, deposits, and branch operations",
    themeColor: "gov-saffron",
    icon: Coins,
    steps: [
      {
        icon: Coins,
        ml: "Sidebar → \"Finance\" തുറക്കുക. Branch / Studio dashboard കാണാം.",
        en: "Open Sidebar → \"Finance\". You'll see the Branch / Studio dashboard.",
      },
      {
        icon: User,
        ml: "Customer onboarding: Customers tab → \"Add Customer\" → KYC details + photo + signature capture",
        en: "Customer onboarding: Customers tab → \"Add Customer\" → KYC details + photo + signature capture",
        tip: "Studio camera ഉപയോഗിച്ച് live photo capture ചെയ്യാം — quality optimized ആകും.",
      },
      {
        icon: Sparkles,
        ml: "Quick Quote: gold weight + purity enter ചെയ്താൽ live gold rate അനുസരിച്ച് loan amount instant calculate ആകും",
        en: "Quick Quote: enter gold weight + purity → loan amount auto-calculates with live gold rate",
      },
      {
        icon: Banknote,
        ml: "Loan create: Loans tab → ornaments details, photos, valuation enter ചെയ്ത് loan disburse ചെയ്യുക",
        en: "Create loan: Loans tab → enter ornaments details, photos, valuation → disburse loan",
      },
      {
        icon: Wallet,
        ml: "Deposits: Customer-ന്റെ recurring / fixed deposit accept ചെയ്യാം. Receipt PDF auto-generate ആകും.",
        en: "Deposits: accept recurring / fixed deposits from customers. Receipt PDF auto-generates.",
      },
      {
        icon: ClipboardList,
        ml: "Cash Book: ഓരോ ദിവസത്തേയും cash in/out auto record. End-of-day report download ചെയ്യാം.",
        en: "Cash Book: every day's cash in/out is auto-recorded. Download end-of-day report.",
      },
      {
        icon: ShieldCheck,
        ml: "Risk Badge: customer-ന്റെ risk profile auto-assess ചെയ്യും (Low / Medium / High) — loan decision-ന് help ആകും",
        en: "Risk Badge: customer's risk profile is auto-assessed (Low / Medium / High) — helps with loan decisions",
      },
    ],
    documents: ["Customer Aadhaar", "PAN", "Address proof", "Passport-size photo", "Gold ornaments (for loan)"],
    approvalTime: "Loan disburse: instant · Deposit: instant",
  },

  // ─────────── Chapter 18 — Custom Forms ───────────
  {
    number: 18,
    titleMl: "Custom Forms",
    titleEn: "Custom Forms",
    subtitleMl: "Admin-defined service forms",
    subtitleEn: "Admin-defined service forms",
    themeColor: "gov-green",
    icon: ClipboardList,
    steps: [
      {
        icon: ClipboardList,
        ml: "Sidebar → \"Forms\" തുറക്കുക. Available form list കാണാം.",
        en: "Open Sidebar → \"Forms\". You'll see available forms.",
      },
      {
        icon: FileText,
        ml: "Form select ചെയ്ത് customer details fill ചെയ്യുക. Required documents upload ചെയ്യുക.",
        en: "Select a form, fill customer details, and upload required documents.",
      },
      {
        icon: CreditCard,
        ml: "Service fee wallet-ൽ നിന്ന് deduct ആകും. Submit click ചെയ്യുക.",
        en: "Service fee deducts from wallet. Click Submit.",
      },
      {
        icon: Clock,
        ml: "Status: staff team form review ചെയ്യും. Update notification വരും. Admin approve ചെയ്താൽ service complete.",
        en: "Status: staff team reviews the form. You'll get an update notification. On admin approval, service is complete.",
      },
    ],
    charges: "Form-അനുസരിച്ച് — admin set ചെയ്യും",
  },

  // ─────────── Chapter 19 — Page Tools (Marketing) ───────────
  {
    number: 19,
    titleMl: "Page Tools",
    titleEn: "Page Tools",
    subtitleMl: "Posters, JPG-to-PDF, billing utilities",
    subtitleEn: "Posters, JPG-to-PDF, billing utilities",
    themeColor: "primary",
    icon: ImageIcon,
    steps: [
      {
        icon: ImageIcon,
        ml: "Sidebar → \"Page Tools\" തുറക്കുക. Available tools കാണാം.",
        en: "Open Sidebar → \"Page Tools\". Browse available utilities.",
      },
      {
        icon: Sparkles,
        ml: "Poster Generator: ready-made templates use ചെയ്ത് shop poster, festival greeting, service ad design ചെയ്യാം",
        en: "Poster Generator: use ready templates to design shop posters, festival greetings, service ads",
        tip: "Daily WhatsApp status / Facebook post-നായി use ചെയ്യാം — customer reach വർദ്ധിപ്പിക്കും.",
      },
      {
        icon: FileText,
        ml: "JPG to PDF: customer documents (Aadhaar / certificate / receipt) ഒന്നിച്ച് PDF ആക്കാം",
        en: "JPG to PDF: combine customer documents (Aadhaar / certificate / receipt) into one PDF",
      },
      {
        icon: Receipt,
        ml: "Service Billing: customer-നുള്ള custom bill / receipt generate ചെയ്യാം — shop name + GST optional",
        en: "Service Billing: generate a custom bill / receipt for customers — shop name + GST optional",
      },
    ],
    charges: "എല്ലാ Page Tools-ഉം Free",
    approvalTime: "Instant",
  },

  // ─────────── Chapter 20 — Referrals ───────────
  {
    number: 20,
    titleMl: "Referral പ്രോഗ്രാം",
    titleEn: "Referral Program",
    subtitleMl: "Friends invite ചെയ്ത് commission നേടാം",
    subtitleEn: "Invite friends and earn commission",
    themeColor: "gov-saffron",
    icon: Gift,
    steps: [
      {
        icon: Gift,
        ml: "Sidebar → \"Referrals\" തുറക്കുക. നിങ്ങളുടെ unique referral code + link കാണാം.",
        en: "Open Sidebar → \"Referrals\". You'll see your unique referral code + link.",
        tip: "Code copy ചെയ്ത് WhatsApp / Facebook-ൽ share ചെയ്യുക.",
      },
      {
        icon: User,
        ml: "Friend നിങ്ങളുടെ link ഉപയോഗിച്ച് signup ചെയ്യും → KYC complete → first activation pay (₹150) ചെയ്യും",
        en: "Friend signs up using your link → completes KYC → pays the first activation (₹150)",
      },
      {
        icon: Award,
        ml: "Activation success ആകുമ്പോൾ — Friend-ന് ₹100 wallet credit, നിങ്ങൾക്ക് ₹50 commission instant credit",
        en: "On activation success — friend gets ₹100 wallet credit, you get ₹50 commission instantly",
      },
      {
        icon: ClipboardList,
        ml: "Stats: Total referrals + earned commission live track ചെയ്യാം",
        en: "Stats: track total referrals + earned commission in real time",
      },
    ],
    charges: "₹50 per successful referral",
    approvalTime: "Instant (atomic credit)",
  },

  // ─────────── Chapter 21 — Work Badge & Worker Profile ───────────
  {
    number: 21,
    titleMl: "Work Badge & Worker Profile",
    titleEn: "Work Badge & Worker Profile",
    subtitleMl: "Public worker profile + verified badge",
    subtitleEn: "Public worker profile + verified badge",
    themeColor: "gov-blue",
    icon: BadgeCheck,
    steps: [
      {
        icon: BadgeCheck,
        ml: "Sidebar → \"Work Badge\" തുറക്കുക. Worker registration form fill ചെയ്യുക.",
        en: "Open Sidebar → \"Work Badge\". Fill the worker registration form.",
      },
      {
        icon: User,
        ml: "Profile details: skills, experience, services offered, photo, location enter ചെയ്യുക",
        en: "Profile details: enter skills, experience, services offered, photo, location",
      },
      {
        icon: ShieldCheck,
        ml: "Verification: KYC docs + skill proof submit. Admin approve ചെയ്തിട്ട് badge issue ആകും.",
        en: "Verification: submit KYC docs + skill proof. Admin approves and badge is issued.",
      },
      {
        icon: Sparkles,
        ml: "Public Profile Link: badge ലഭിച്ചാൽ shareable URL കിട്ടും — customers അവിടെ booking request submit ചെയ്യാം",
        en: "Public Profile Link: once badged, get a shareable URL — customers can submit booking requests there",
        tip: "Profile link WhatsApp BIO / Facebook page-ൽ paste ചെയ്ത് leads നേടാം.",
      },
      {
        icon: Briefcase,
        ml: "Job marketplace-ൽ verified badge auto-display ആകും — customer trust വർദ്ധിക്കും",
        en: "Verified badge auto-displays in job marketplace — boosts customer trust",
      },
    ],
    documents: ["Aadhaar", "Skill proof / certificate", "Recent photo", "Address proof"],
    approvalTime: "24–48 hours",
  },

  // ─────────── Chapter 22 — Staff Management ───────────
  {
    number: 22,
    titleMl: "Staff Management",
    titleEn: "Staff Management",
    subtitleMl: "Sub-accounts create + permissions",
    subtitleEn: "Create sub-accounts + manage permissions",
    themeColor: "gov-green",
    icon: Users,
    steps: [
      {
        icon: Users,
        ml: "Sidebar → \"Staff\" തുറക്കുക. Existing staff list കാണാം.",
        en: "Open Sidebar → \"Staff\". You'll see existing staff list.",
      },
      {
        icon: User,
        ml: "\"Add Staff\" click ചെയ്യുക → name, email, password set ചെയ്യുക",
        en: "Click \"Add Staff\" → set name, email, and password",
        note: "Staff-ന് separate login ലഭിക്കും — main account password share ചെയ്യേണ്ട ആവശ്യമില്ല.",
      },
      {
        icon: ShieldCheck,
        ml: "Permissions: ഓരോ service-നും access toggle ചെയ്യാം. Wallet limit set ചെയ്യാം.",
        en: "Permissions: toggle access per service. Set a wallet limit.",
      },
      {
        icon: ClipboardList,
        ml: "Activity Log: ഓരോ staff-ന്റെ transactions + actions audit log-ൽ കാണാം",
        en: "Activity Log: see each staff member's transactions + actions in the audit log",
      },
      {
        icon: Sparkles,
        ml: "Staff Wallet: main wallet-ൽ നിന്ന് staff wallet-ലേക്ക് amount transfer ചെയ്യാം — daily limit set ചെയ്യാം",
        en: "Staff Wallet: transfer from main wallet to staff wallet — set a daily limit",
      },
    ],
    charges: "Free — unlimited staff accounts",
  },

  // ─────────── Chapter 23 — Support ───────────
  {
    number: 23,
    titleMl: "Support & Help Desk",
    titleEn: "Support & Help Desk",
    subtitleMl: "ഞങ്ങൾ എപ്പോഴും കൂടെയുണ്ട്",
    subtitleEn: "We are always with you",
    themeColor: "gov-green",
    icon: HelpCircle,
    steps: [
      {
        icon: HelpCircle,
        ml: "Floating chat button (bottom-right) — AI bot 24/7 available",
        en: "Floating chat button (bottom-right) — AI bot available 24/7",
        tip: "ഏത് service-നെ കുറിച്ച് doubts ചോദിക്കാം — instant answer ലഭിക്കും.",
      },
      {
        icon: User,
        ml: "Live Chat: chat panel-ൽ \"Live\" tab — admin / staff team-ന് message അയക്കാം",
        en: "Live Chat: in the chat panel → \"Live\" tab — message the admin / staff team",
      },
      {
        icon: FileText,
        ml: "Email: support@eisoluions.xyz",
        en: "Email: support@eisoluions.xyz",
      },
      {
        icon: Award,
        ml: "നന്ദി! ഈ guide complete ചെയ്തതിൽ. എല്ലാ services-ഉം നിങ്ങൾക്ക് confidence-ഓടെ deliver ചെയ്യാം.",
        en: "Thank you for completing this guide! You can now deliver every service confidently.",
      },
    ],
  },
];
