/**
 * Bharat Connect — Mock Data for Demo Mode.
 *
 * When provider credentials (BBPS_CLIENT_ID / BBPS_CLIENT_SECRET / BBPS_AES_KEY)
 * are not yet configured, server functions transparently fall back to this data
 * so retailers can preview the full Bharat Connect flow end-to-end.
 *
 * No wallet is debited in mock mode. Receipts are generated with `MOCK-` prefix.
 */
import type {
  BbpsCategory,
  BbpsBiller,
  BbpsCustomerParam,
  BbpsBillFetchResult,
} from "./bbps-types";

/** True when provider creds are missing — server should mock the response. */
export function isMockMode(): boolean {
  return !process.env.BBPS_CLIENT_ID || !process.env.BBPS_CLIENT_SECRET;
}

export const MOCK_CATEGORIES: BbpsCategory[] = [
  { id: 1, name: "Electricity", icon: "⚡", position: 1 },
  { id: 2, name: "Mobile Postpaid", icon: "📱", position: 2 },
  { id: 3, name: "Mobile Prepaid", icon: "📲", position: 3 },
  { id: 4, name: "DTH", icon: "📺", position: 4 },
  { id: 5, name: "Gas", icon: "🔥", position: 5 },
  { id: 6, name: "Water", icon: "💧", position: 6 },
  { id: 7, name: "Broadband", icon: "🌐", position: 7 },
  { id: 8, name: "FASTag", icon: "🚗", position: 8 },
  { id: 9, name: "LPG Cylinder", icon: "🛢️", position: 9 },
  { id: 10, name: "Insurance", icon: "🛡️", position: 10 },
  { id: 11, name: "Loan EMI", icon: "🏦", position: 11 },
  { id: 12, name: "Credit Card", icon: "💳", position: 12 },
];

const BILLERS_BY_CAT: Record<string, BbpsBiller[]> = {
  Electricity: [
    { bill_id: 101, id: "KSEBL0000KER01", name: "Kerala State Electricity Board (KSEB)", categoryName: "Electricity", mode: 1 },
    { bill_id: 102, id: "TANGEDCO0000TN", name: "TANGEDCO (Tamil Nadu)", categoryName: "Electricity", mode: 1 },
    { bill_id: 103, id: "BESCOM0000KAR", name: "BESCOM (Bengaluru)", categoryName: "Electricity", mode: 1 },
    { bill_id: 104, id: "TATAPOWER000MH", name: "Tata Power (Mumbai)", categoryName: "Electricity", mode: 1 },
    { bill_id: 105, id: "ADANIELEC00MH", name: "Adani Electricity (Mumbai)", categoryName: "Electricity", mode: 1 },
    { bill_id: 106, id: "BSESRAJDH0DEL", name: "BSES Rajdhani (Delhi)", categoryName: "Electricity", mode: 1 },
  ],
  "Mobile Postpaid": [
    { bill_id: 201, id: "AIRTEL00000PST", name: "Airtel Postpaid", categoryName: "Mobile Postpaid", mode: 1 },
    { bill_id: 202, id: "JIO0000000PST", name: "Jio Postpaid", categoryName: "Mobile Postpaid", mode: 1 },
    { bill_id: 203, id: "VODAFONE000PST", name: "Vi (Vodafone Idea) Postpaid", categoryName: "Mobile Postpaid", mode: 1 },
    { bill_id: 204, id: "BSNL000000PST", name: "BSNL Postpaid", categoryName: "Mobile Postpaid", mode: 1 },
  ],
  "Mobile Prepaid": [
    { bill_id: 301, id: "AIRTEL00000PRE", name: "Airtel Prepaid", categoryName: "Mobile Prepaid", mode: 2 },
    { bill_id: 302, id: "JIO0000000PRE", name: "Jio Prepaid", categoryName: "Mobile Prepaid", mode: 2 },
    { bill_id: 303, id: "VODAFONE000PRE", name: "Vi Prepaid", categoryName: "Mobile Prepaid", mode: 2 },
    { bill_id: 304, id: "BSNL000000PRE", name: "BSNL Prepaid", categoryName: "Mobile Prepaid", mode: 2 },
  ],
  DTH: [
    { bill_id: 401, id: "TATASKY000DTH", name: "Tata Play (Tata Sky)", categoryName: "DTH", mode: 2 },
    { bill_id: 402, id: "AIRTELDTH00", name: "Airtel Digital TV", categoryName: "DTH", mode: 2 },
    { bill_id: 403, id: "DISHTV0000DTH", name: "Dish TV", categoryName: "DTH", mode: 2 },
    { bill_id: 404, id: "SUNDIRECT00DTH", name: "Sun Direct", categoryName: "DTH", mode: 2 },
    { bill_id: 405, id: "VIDEOCON00D2H", name: "d2h (Videocon)", categoryName: "DTH", mode: 2 },
  ],
  Gas: [
    { bill_id: 501, id: "MAHANAGAR0GAS", name: "Mahanagar Gas (Mumbai)", categoryName: "Gas", mode: 1 },
    { bill_id: 502, id: "INDRAPRASTHA0", name: "Indraprastha Gas (Delhi)", categoryName: "Gas", mode: 1 },
    { bill_id: 503, id: "GUJARATGAS00", name: "Gujarat Gas", categoryName: "Gas", mode: 1 },
  ],
  Water: [
    { bill_id: 601, id: "BWSSB0000KAR", name: "BWSSB (Bengaluru)", categoryName: "Water", mode: 1 },
    { bill_id: 602, id: "DJB000000DEL", name: "Delhi Jal Board", categoryName: "Water", mode: 1 },
    { bill_id: 603, id: "KWA0000000KER", name: "Kerala Water Authority", categoryName: "Water", mode: 1 },
  ],
  Broadband: [
    { bill_id: 701, id: "JIOFIBER000", name: "JioFiber", categoryName: "Broadband", mode: 1 },
    { bill_id: 702, id: "AIRTELXSTREAM", name: "Airtel Xstream Fiber", categoryName: "Broadband", mode: 1 },
    { bill_id: 703, id: "BSNLBROAD000", name: "BSNL Broadband", categoryName: "Broadband", mode: 1 },
    { bill_id: 704, id: "ACTBROADBAND0", name: "ACT Fibernet", categoryName: "Broadband", mode: 1 },
  ],
  FASTag: [
    { bill_id: 801, id: "PAYTMFASTAG00", name: "Paytm Payments Bank FASTag", categoryName: "FASTag", mode: 2 },
    { bill_id: 802, id: "ICICIFASTAG00", name: "ICICI Bank FASTag", categoryName: "FASTag", mode: 2 },
    { bill_id: 803, id: "SBIFASTAG0000", name: "SBI FASTag", categoryName: "FASTag", mode: 2 },
    { bill_id: 804, id: "AXISFASTAG000", name: "Axis Bank FASTag", categoryName: "FASTag", mode: 2 },
  ],
  "LPG Cylinder": [
    { bill_id: 901, id: "INDANE0000LPG", name: "Indane Gas (IOCL)", categoryName: "LPG Cylinder", mode: 1 },
    { bill_id: 902, id: "BHARATGAS00", name: "Bharat Gas (BPCL)", categoryName: "LPG Cylinder", mode: 1 },
    { bill_id: 903, id: "HPGAS00000LPG", name: "HP Gas (HPCL)", categoryName: "LPG Cylinder", mode: 1 },
  ],
  Insurance: [
    { bill_id: 1001, id: "LIC0000000INS", name: "LIC of India", categoryName: "Insurance", mode: 1 },
    { bill_id: 1002, id: "HDFCLIFE000", name: "HDFC Life Insurance", categoryName: "Insurance", mode: 1 },
    { bill_id: 1003, id: "SBILIFE0000", name: "SBI Life Insurance", categoryName: "Insurance", mode: 1 },
  ],
  "Loan EMI": [
    { bill_id: 1101, id: "BAJAJFINANCE0", name: "Bajaj Finance", categoryName: "Loan EMI", mode: 1 },
    { bill_id: 1102, id: "HDFCLOAN0000", name: "HDFC Bank Loans", categoryName: "Loan EMI", mode: 1 },
  ],
  "Credit Card": [
    { bill_id: 1201, id: "HDFCCC0000000", name: "HDFC Credit Card", categoryName: "Credit Card", mode: 2 },
    { bill_id: 1202, id: "SBICC00000000", name: "SBI Credit Card", categoryName: "Credit Card", mode: 2 },
    { bill_id: 1203, id: "ICICICC000000", name: "ICICI Credit Card", categoryName: "Credit Card", mode: 2 },
  ],
};

export function mockBillersFor(category: string): BbpsBiller[] {
  return BILLERS_BY_CAT[category] ?? [];
}

/**
 * Synthesise reasonable customer-input fields per category. Real provider
 * returns these dynamically; for demo we mirror common bill-fetch inputs.
 */
export function mockParamsFor(billerId: string, categoryName: string): { params: BbpsCustomerParam[]; mode: number } {
  const mk = (name: string, type: BbpsCustomerParam["type"] = "ALPHANUMERIC", maxLength = "20"): BbpsCustomerParam => ({
    name,
    type,
    isMandatory: true,
    maxLength,
  });

  switch (categoryName) {
    case "Electricity":
      return { params: [mk("Consumer Number", "NUMERIC", "13")], mode: 1 };
    case "Mobile Postpaid":
      return { params: [mk("Mobile Number", "NUMERIC", "10")], mode: 1 };
    case "Mobile Prepaid":
      return {
        params: [
          mk("Mobile Number", "NUMERIC", "10"),
          mk("Operator Circle", "ALPHANUMERIC", "30"),
        ],
        mode: 2,
      };
    case "DTH":
      return { params: [mk("Subscriber ID / VC No.", "NUMERIC", "12")], mode: 2 };
    case "Gas":
      return { params: [mk("Consumer Number", "NUMERIC", "12")], mode: 1 };
    case "Water":
      return { params: [mk("RR Number / Consumer ID", "ALPHANUMERIC", "15")], mode: 1 };
    case "Broadband":
      return { params: [mk("Account Number", "ALPHANUMERIC", "15")], mode: 1 };
    case "FASTag":
      return { params: [mk("Vehicle Registration No.", "ALPHANUMERIC", "15")], mode: 2 };
    case "LPG Cylinder":
      return { params: [mk("Consumer ID / Mobile", "NUMERIC", "12")], mode: 1 };
    case "Insurance":
      return { params: [mk("Policy Number", "ALPHANUMERIC", "15")], mode: 1 };
    case "Loan EMI":
      return { params: [mk("Loan Account Number", "ALPHANUMERIC", "20")], mode: 1 };
    case "Credit Card":
      return { params: [mk("Card Number (last 16)", "NUMERIC", "16")], mode: 2 };
    default:
      return { params: [mk("Consumer Number")], mode: 1 };
  }
}

/** Plausible customer names for demo bills. */
const NAMES = [
  "RAJESH KUMAR", "PRIYA NAIR", "AMIT SHARMA", "DEEPIKA MENON",
  "SURESH PATEL", "ANJALI IYER", "VIKRAM SINGH", "MEERA NAMBIAR",
  "ARJUN PILLAI", "KAVYA REDDY", "MANOJ VERMA", "SNEHA THOMAS",
];

/**
 * Produce a deterministic-but-varied mock bill given biller + customer input.
 * Same input → same bill (idempotent across retries).
 */
export function mockBillFor(
  billerId: string,
  categoryName: string,
  paramValues: string[],
): BbpsBillFetchResult {
  // Hash inputs to pick stable values.
  const seed = [billerId, ...paramValues].join("|");
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const abs = Math.abs(h);

  // Amount range varies by category.
  const ranges: Record<string, [number, number]> = {
    Electricity: [350, 4500],
    "Mobile Postpaid": [299, 1499],
    "Mobile Prepaid": [149, 999],
    DTH: [199, 599],
    Gas: [450, 1200],
    Water: [120, 850],
    Broadband: [499, 1999],
    FASTag: [200, 2000],
    "LPG Cylinder": [950, 1100],
    Insurance: [1500, 25000],
    "Loan EMI": [3500, 45000],
    "Credit Card": [1200, 35000],
  };
  const [lo, hi] = ranges[categoryName] ?? [200, 2000];
  const amount = lo + (abs % (hi - lo));

  const today = new Date();
  const billDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
  const dueDate = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return {
    insertid: 100000 + (abs % 900000),
    amount,
    custname: NAMES[abs % NAMES.length],
    dueDate: fmt(dueDate),
    billDate: fmt(billDate),
    billNumber: `BILL${String(abs % 10000000).padStart(7, "0")}`,
    message: "Bill fetched successfully (DEMO)",
    requestId: `MOCK-REQ-${abs.toString(36).toUpperCase()}`,
  };
}

/** Generate a mock receipt number for demo payments. */
export function mockReceipt(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MOCK-${ts}-${rand}`;
}
