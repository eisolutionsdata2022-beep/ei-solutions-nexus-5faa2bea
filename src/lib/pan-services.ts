/**
 * PAN PORTAL service catalog — 11 services mapped to mallikacyberzone APIs.
 *
 * Each service declares:
 *  - the upstream endpoint key (matches PanMasterConfig.urls)
 *  - HTTP method (GET query-string vs POST JSON body)
 *  - the form fields the retailer must fill, and how they map to the API
 */
import {
  IdCard,
  FilePlus2,
  FilePenLine,
  Zap,
  ScanLine,
  Search,
  Download,
  UserPlus,
  KeyRound,
  Ticket,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

export type PanFieldType = "text" | "number" | "email" | "tel" | "date" | "select";

export interface PanField {
  key: string;
  label: string;
  type: PanFieldType;
  required: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  /** For `select` only — used when posting to NSDL etc. */
  defaultValue?: string;
}

export type PanEndpointKey =
  | "psaCreate"
  | "couponBuy"
  | "couponStatus"
  | "passwordReset"
  | "nsdlAuth"
  | "nsdlTxnStatus"
  | "nsdlPanStatus"
  | "panStatus";

export interface PanService {
  /** Stable key — never rename. */
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  /** Upstream endpoint — looked up in PanMasterConfig.urls. */
  endpoint: PanEndpointKey;
  /** HTTP method. mallikacyberzone uses GET (query string) for most, POST JSON for NSDL. */
  method: "GET" | "POST";
  /** When method = POST, send body as JSON. When GET, fields appended as query params. */
  /** Default convenience fee (₹). */
  defaultFee: number;
  /** Fields the retailer fills. */
  fields: PanField[];
  /** If true, after success the bridge returns a `redirect` URL the retailer must open
   *  (NSDL eKYC). The retailer's client opens it in a new tab. */
  expectsRedirect?: boolean;
  /** Hard-coded extras merged into the request payload (e.g. application_type=49A). */
  extras?: Record<string, string>;
  /** Optional override for the field name carrying the order id (used by status checks). */
  orderIdField?: string;
}

const STATE_OPTIONS = [
  { value: "1", label: "Andhra Pradesh" },
  { value: "2", label: "Arunachal Pradesh" },
  { value: "3", label: "Assam" },
  { value: "4", label: "Bihar" },
  { value: "5", label: "Chhattisgarh" },
  { value: "6", label: "Goa" },
  { value: "7", label: "Gujarat" },
  { value: "8", label: "Haryana" },
  { value: "9", label: "Himachal Pradesh" },
  { value: "10", label: "Jammu & Kashmir" },
  { value: "11", label: "Jharkhand" },
  { value: "12", label: "Karnataka" },
  { value: "13", label: "Kerala" },
  { value: "14", label: "Madhya Pradesh" },
  { value: "15", label: "Maharashtra" },
  { value: "16", label: "Manipur" },
  { value: "17", label: "Meghalaya" },
  { value: "18", label: "Mizoram" },
  { value: "19", label: "Nagaland" },
  { value: "20", label: "Odisha" },
  { value: "21", label: "Punjab" },
  { value: "22", label: "Rajasthan" },
  { value: "23", label: "Sikkim" },
  { value: "24", label: "Tamil Nadu" },
  { value: "25", label: "Telangana" },
  { value: "26", label: "Tripura" },
  { value: "27", label: "Uttar Pradesh" },
  { value: "28", label: "Uttarakhand" },
  { value: "29", label: "West Bengal" },
  { value: "30", label: "Andaman & Nicobar" },
  { value: "31", label: "Chandigarh" },
  { value: "32", label: "Dadra & Nagar Haveli" },
  { value: "33", label: "Daman & Diu" },
  { value: "34", label: "Delhi" },
  { value: "35", label: "Lakshadweep" },
  { value: "36", label: "Puducherry" },
  { value: "37", label: "Ladakh" },
];

/** Common applicant fields shared by NSDL eKYC services. */
const NSDL_APPLICANT_FIELDS: PanField[] = [
  { key: "name", label: "Full Name", type: "text", required: true, placeholder: "As per Aadhaar" },
  { key: "dob", label: "Date of Birth", type: "text", required: true, placeholder: "DD/MM/YYYY", hint: "Format: DD/MM/YYYY" },
  {
    key: "gender",
    label: "Gender",
    type: "select",
    required: true,
    options: [
      { value: "M", label: "Male" },
      { value: "F", label: "Female" },
    ],
    defaultValue: "M",
  },
  { key: "mobile", label: "Mobile", type: "tel", required: true, placeholder: "10-digit mobile" },
  { key: "email", label: "Email", type: "email", required: true, placeholder: "applicant@example.com" },
];

export const PAN_SERVICES: PanService[] = [
  // 1. New PAN (NSDL eKYC, application_type=49A, mode=EKYC)
  {
    key: "new-pan",
    name: "New PAN Apply",
    description: "Instant Aadhaar eKYC PAN application via NSDL",
    icon: FilePlus2,
    gradient: "from-blue-500 to-indigo-600",
    endpoint: "nsdlAuth",
    method: "POST",
    defaultFee: 107,
    expectsRedirect: true,
    extras: {
      application_mode: "EKYC",
      application_type: "49A",
      category: "P",
      is_physical_pan_required: "Y",
      consent: "Y",
    },
    fields: NSDL_APPLICANT_FIELDS,
  },
  // 2. PAN Correction (CR)
  {
    key: "pan-correction",
    name: "PAN Correction",
    description: "Correct name / DOB / photo on existing PAN",
    icon: FilePenLine,
    gradient: "from-amber-500 to-orange-600",
    endpoint: "nsdlAuth",
    method: "POST",
    defaultFee: 107,
    expectsRedirect: true,
    extras: {
      application_mode: "EKYC",
      application_type: "CR",
      category: "P",
      is_physical_pan_required: "Y",
      consent: "Y",
    },
    fields: [
      ...NSDL_APPLICANT_FIELDS,
      { key: "existing_pan", label: "Existing PAN", type: "text", required: true, placeholder: "ABCDE1234F" },
    ],
  },
  // 3. Instant eKYC PAN — same as New PAN but no physical card (e-PAN only).
  {
    key: "instant-ekyc-pan",
    name: "Instant eKYC PAN",
    description: "Aadhaar OTP — e-PAN only (no physical card)",
    icon: Zap,
    gradient: "from-emerald-500 to-teal-600",
    endpoint: "nsdlAuth",
    method: "POST",
    defaultFee: 95,
    expectsRedirect: true,
    extras: {
      application_mode: "EKYC",
      application_type: "49A",
      category: "P",
      is_physical_pan_required: "N",
      consent: "Y",
    },
    fields: NSDL_APPLICANT_FIELDS,
  },
  // 4. NSDL PAN — eSign / scan based
  {
    key: "nsdl-pan",
    name: "NSDL PAN (eSign)",
    description: "Scan-based NSDL PAN with eSign",
    icon: IdCard,
    gradient: "from-violet-500 to-purple-600",
    endpoint: "nsdlAuth",
    method: "POST",
    defaultFee: 120,
    expectsRedirect: true,
    extras: {
      application_mode: "ESIGN",
      application_type: "49A",
      category: "P",
      is_physical_pan_required: "Y",
      consent: "Y",
    },
    fields: NSDL_APPLICANT_FIELDS,
  },
  // 5. UTI PAN — handled via same NSDL gateway (mallikacyberzone routes both); admins
  // can switch the URL via "panStatus" field if needed. Placeholder shell.
  {
    key: "uti-pan",
    name: "UTI PAN",
    description: "UTI PAN application (eKYC/eSign)",
    icon: ScanLine,
    gradient: "from-rose-500 to-pink-600",
    endpoint: "nsdlAuth",
    method: "POST",
    defaultFee: 110,
    expectsRedirect: true,
    extras: {
      application_mode: "EKYC",
      application_type: "49A",
      category: "P",
      is_physical_pan_required: "Y",
      consent: "Y",
      provider: "UTI",
    },
    fields: NSDL_APPLICANT_FIELDS,
  },
  // 6. PAN Track (NSDL txn status)
  {
    key: "pan-track",
    name: "PAN Track",
    description: "Check NSDL transaction status by order ID",
    icon: Search,
    gradient: "from-cyan-500 to-blue-600",
    endpoint: "nsdlTxnStatus",
    method: "POST",
    defaultFee: 0,
    fields: [
      { key: "order_id", label: "Order ID", type: "text", required: true, placeholder: "NSDL202304290947" },
    ],
    orderIdField: "order_id",
  },
  // 7. ePAN Download (NSDL pan status by ack no)
  {
    key: "epan-download",
    name: "ePAN Download",
    description: "Check PAN allotment status by acknowledgement number",
    icon: Download,
    gradient: "from-indigo-500 to-blue-700",
    endpoint: "nsdlPanStatus",
    method: "POST",
    defaultFee: 0,
    fields: [
      { key: "ack_no", label: "Acknowledgement No", type: "text", required: true, placeholder: "990019705725595" },
    ],
  },
  // 8. PSA ID Create
  {
    key: "psa-create",
    name: "PSA ID Create",
    description: "Create a new PSA (VLE) account on mallikacyberzone",
    icon: UserPlus,
    gradient: "from-green-500 to-emerald-600",
    endpoint: "psaCreate",
    method: "GET",
    defaultFee: 0,
    fields: [
      { key: "vle_id", label: "VLE ID", type: "text", required: true, placeholder: "PSA123456" },
      { key: "vle_name", label: "VLE Name", type: "text", required: true },
      { key: "vle_shop", label: "Shop Name", type: "text", required: true },
      { key: "vle_mob", label: "Mobile", type: "tel", required: true },
      { key: "vle_email", label: "Email", type: "email", required: true },
      { key: "vle_loc", label: "Location / City", type: "text", required: true },
      { key: "vle_state", label: "State", type: "select", required: true, options: STATE_OPTIONS },
      { key: "vle_pin", label: "PIN Code", type: "number", required: true },
      { key: "vle_uid", label: "Aadhaar (12 digit)", type: "number", required: true },
      { key: "vle_pan", label: "PAN", type: "text", required: true, placeholder: "ABCDE1234F" },
    ],
  },
  // 9. PSA Password Reset
  {
    key: "psa-password-reset",
    name: "PSA Password Reset",
    description: "Reset password for an existing PSA / VLE account",
    icon: KeyRound,
    gradient: "from-yellow-500 to-amber-600",
    endpoint: "passwordReset",
    method: "GET",
    defaultFee: 0,
    fields: [
      { key: "vle_id", label: "VLE ID", type: "text", required: true, placeholder: "PSA123456" },
    ],
  },
  // 10. Coupon Buy
  {
    key: "coupon-buy",
    name: "Coupon Buy",
    description: "Purchase NSDL PAN coupons in bulk",
    icon: Ticket,
    gradient: "from-fuchsia-500 to-pink-600",
    endpoint: "couponBuy",
    method: "GET",
    defaultFee: 0,
    fields: [
      { key: "vle_id", label: "VLE ID", type: "text", required: true, placeholder: "PSA123456" },
      {
        key: "type",
        label: "Coupon Type",
        type: "select",
        required: true,
        options: [
          { value: "1", label: "Type 1 — NSDL eKYC" },
          { value: "2", label: "Type 2 — NSDL eSign" },
          { value: "3", label: "Type 3 — UTI" },
        ],
        defaultValue: "1",
      },
      { key: "qty", label: "Quantity", type: "number", required: true, placeholder: "10" },
    ],
  },
  // 11. Coupon Status
  {
    key: "coupon-status",
    name: "Coupon Status",
    description: "Check status of a coupon purchase order",
    icon: ListChecks,
    gradient: "from-slate-500 to-slate-700",
    endpoint: "couponStatus",
    method: "GET",
    defaultFee: 0,
    fields: [
      { key: "order_id", label: "Order ID", type: "text", required: true, placeholder: "2023032705381935855703" },
    ],
    orderIdField: "order_id",
  },
];

export function findPanService(key: string): PanService | undefined {
  return PAN_SERVICES.find((s) => s.key === key);
}
