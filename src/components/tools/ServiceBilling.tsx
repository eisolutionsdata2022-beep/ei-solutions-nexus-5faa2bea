import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";


// ─── Category Data ───────────────────────────────────────────────
interface ServiceEntry {
  name: string;
  govtFee: string;
  serviceCharge: string;
  total: string;
}

interface Category {
  icon: string;
  title: string;
  color: string;
  chargeModel: string;
  count: number;
  services: ServiceEntry[];
}

const CATEGORIES: Category[] = [
  {
    icon: "🏛️",
    title: "e-District Services",
    color: "#1a237e",
    chargeModel: "Govt Fee + ₹40",
    count: 50,
    services: [
      { name: "Income Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Caste Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Nativity Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Residence Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Family Membership", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Possession Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Legal Heir Certificate", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Non-Creamy Layer", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Solvency Certificate", govtFee: "₹100", serviceCharge: "₹40", total: "₹140" },
      { name: "Dependency Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Minority Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Widow Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Unemployment Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Destitute Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Birth Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Death Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Marriage Certificate", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "One & Same Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Relationship Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Identity Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Domicile Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Land Ownership Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Agricultural Income Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "BPL Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "OBC Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "SC/ST Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Migration Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Conversion Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Ration Card Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Pension Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Disability Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Senior Citizen Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Education Certificate Verification", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Address Proof Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Income & Asset Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Character Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Court Fee Stamp Service", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "eStamp Service", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Revenue Recovery Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Building Tax Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Property Ownership Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Land Tax Receipt", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Land Sketch", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Thandaper Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Possession & Non-Attachment", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Encumbrance Certificate Apply", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Village Office Services", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Taluk Office Services", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "District Office Services", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Misc Certificate Services", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
    ],
  },
  {
    icon: "🪪",
    title: "Identity Services",
    color: "#e65100",
    chargeModel: "Variable",
    count: 20,
    services: [
      { name: "Aadhaar New Enrollment", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Aadhaar Update (Biometric)", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Aadhaar Address Update", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Aadhaar Mobile Update", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "PAN Card New", govtFee: "₹107", serviceCharge: "₹250", total: "₹357" },
      { name: "PAN Correction", govtFee: "₹107", serviceCharge: "₹250", total: "₹357" },
      { name: "ePAN Download", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Voter ID New", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Voter ID Correction", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Voter ID Transfer", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Passport Apply", govtFee: "₹1500", serviceCharge: "₹100", total: "₹1600" },
      { name: "Passport Renewal", govtFee: "₹1500", serviceCharge: "₹100", total: "₹1600" },
      { name: "Police Verification", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Driving License Apply", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "DL Renewal", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "DL Duplicate", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "Learner License", govtFee: "₹150", serviceCharge: "₹50", total: "₹200" },
      { name: "RC Book Apply", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "RC Transfer", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "Vehicle Ownership Update", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
    ],
  },
  {
    icon: "🏥",
    title: "Health Services",
    color: "#2e7d32",
    chargeModel: "Variable",
    count: 20,
    services: [
      { name: "ABHA Card Creation", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Health ID Update", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Health Record Upload", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Hospital Registration", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Clinic Registration", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Telemedicine Booking", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Lab Test Booking", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Doctor Appointment", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Vaccination Registration", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Ayushman Bharat Apply", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Insurance Claim Support", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Health Card Printing", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Digital Prescription Upload", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "eSanjeevani Services", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Health Scheme Apply", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Medical Certificate Apply", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Disability Assessment", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Health Insurance Enrollment", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Medical Loan Apply", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Health Report Download", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
    ],
  },
  {
    icon: "💰",
    title: "Banking & Financial",
    color: "#1565c0",
    chargeModel: "Commission Based",
    count: 45,
    services: [
      { name: "Bank Account Opening", govtFee: "Free", serviceCharge: "₹100", total: "₹100" },
      { name: "Mini Statement", govtFee: "-", serviceCharge: "₹10", total: "₹10" },
      { name: "Balance Check", govtFee: "-", serviceCharge: "₹10", total: "₹10" },
      { name: "AEPS Withdrawal", govtFee: "-", serviceCharge: "₹10–20", total: "-" },
      { name: "AEPS Deposit", govtFee: "-", serviceCharge: "₹10–20", total: "-" },
      { name: "Money Transfer", govtFee: "-", serviceCharge: "₹10–50", total: "-" },
      { name: "UPI Registration", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Debit Card Apply", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Credit Card Apply", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
      { name: "Loan Apply", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Personal Loan", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Gold Loan", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Business Loan", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Education Loan", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Vehicle Loan", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Insurance Apply", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Life Insurance", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Health Insurance", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Vehicle Insurance", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "PMJJBY", govtFee: "₹436/yr", serviceCharge: "₹20", total: "₹456" },
      { name: "PMSBY", govtFee: "₹20/yr", serviceCharge: "₹20", total: "₹40" },
      { name: "APY", govtFee: "Variable", serviceCharge: "₹30", total: "-" },
      { name: "Pension Apply", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "PF Withdrawal", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "PF Transfer", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Mutual Fund Apply", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "SIP Investment", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "NPS Registration", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "FASTag Apply", govtFee: "₹100", serviceCharge: "₹50", total: "₹150" },
      { name: "FASTag Recharge", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "EMI Payment", govtFee: "-", serviceCharge: "₹20", total: "-" },
      { name: "Loan Closure", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Credit Score Check", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Cheque Book Request", govtFee: "-", serviceCharge: "₹30", total: "₹30" },
      { name: "ATM Pin Reset", govtFee: "-", serviceCharge: "₹20", total: "₹20" },
      { name: "Net Banking Activation", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Mobile Banking", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Account Statement", govtFee: "-", serviceCharge: "₹20", total: "₹20" },
      { name: "Fixed Deposit", govtFee: "-", serviceCharge: "₹30", total: "₹30" },
      { name: "Recurring Deposit", govtFee: "-", serviceCharge: "₹30", total: "₹30" },
      { name: "Forex Service", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
      { name: "International Transfer", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Wallet Recharge", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Micro ATM Service", govtFee: "-", serviceCharge: "₹10–20", total: "-" },
      { name: "Financial Advisory", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
    ],
  },
  {
    icon: "🚗",
    title: "Transport Services",
    color: "#c62828",
    chargeModel: "Govt Fee + ₹50",
    count: 30,
    services: [
      { name: "Driving License", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "Learner License", govtFee: "₹150", serviceCharge: "₹50", total: "₹200" },
      { name: "DL Renewal", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "DL Duplicate", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "DL Address Change", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "RC Book", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "RC Transfer", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "Vehicle Renewal", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Vehicle Fitness", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "Vehicle Permit", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Road Tax Payment", govtFee: "Variable", serviceCharge: "₹50", total: "-" },
      { name: "e-Challan Payment", govtFee: "-", serviceCharge: "₹20", total: "-" },
      { name: "Fancy Number Booking", govtFee: "Variable", serviceCharge: "₹100", total: "-" },
      { name: "Hypothecation Entry", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "Hypothecation Removal", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "Insurance Update", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Pollution Certificate", govtFee: "₹60", serviceCharge: "₹40", total: "₹100" },
      { name: "Vehicle Loan NOC", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Vehicle Re-registration", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "Duplicate RC", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "International Driving Permit", govtFee: "₹1000", serviceCharge: "₹100", total: "₹1100" },
      { name: "Badge Apply", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "Commercial License", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Permit Renewal", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Vehicle Ownership Transfer", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "Scrap Certificate", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "Green Tax Payment", govtFee: "Variable", serviceCharge: "₹50", total: "-" },
      { name: "Vehicle History Check", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Transport Permit", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Tourist Permit", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
    ],
  },
  {
    icon: "🏢",
    title: "LSGD / Panchayat",
    color: "#4527a0",
    chargeModel: "Variable",
    count: 30,
    services: [
      { name: "Property Tax", govtFee: "-", serviceCharge: "₹30", total: "-" },
      { name: "Building Tax", govtFee: "-", serviceCharge: "₹30", total: "-" },
      { name: "Trade License", govtFee: "₹500", serviceCharge: "₹100", total: "₹600" },
      { name: "Birth Registration", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Death Registration", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Marriage Registration", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Building Permit", govtFee: "₹1000", serviceCharge: "₹200", total: "₹1200" },
      { name: "Water Connection", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Drainage Connection", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "Waste Management", govtFee: "-", serviceCharge: "₹30", total: "-" },
      { name: "Shop License", govtFee: "₹500", serviceCharge: "₹100", total: "₹600" },
      { name: "Business Registration", govtFee: "₹500", serviceCharge: "₹100", total: "₹600" },
      { name: "Renewal License", govtFee: "₹300", serviceCharge: "₹50", total: "₹350" },
      { name: "Land Tax Payment", govtFee: "-", serviceCharge: "₹30", total: "-" },
      { name: "Street Light Complaint", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Public Grievance", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Health License", govtFee: "₹500", serviceCharge: "₹100", total: "₹600" },
      { name: "Food License", govtFee: "₹500", serviceCharge: "₹100", total: "₹600" },
      { name: "Sanitation Certificate", govtFee: "₹100", serviceCharge: "₹40", total: "₹140" },
      { name: "Building Plan Approval", govtFee: "₹1000", serviceCharge: "₹200", total: "₹1200" },
      { name: "Ownership Change", govtFee: "₹200", serviceCharge: "₹50", total: "₹250" },
      { name: "Tax Certificate", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Rent Agreement Registration", govtFee: "₹100", serviceCharge: "₹50", total: "₹150" },
      { name: "Encumbrance Certificate", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Mutation Apply", govtFee: "₹100", serviceCharge: "₹50", total: "₹150" },
      { name: "Property Valuation", govtFee: "₹200", serviceCharge: "₹100", total: "₹300" },
      { name: "Land Conversion", govtFee: "₹500", serviceCharge: "₹100", total: "₹600" },
      { name: "Layout Approval", govtFee: "₹1000", serviceCharge: "₹200", total: "₹1200" },
      { name: "Permit Cancellation", govtFee: "₹100", serviceCharge: "₹50", total: "₹150" },
      { name: "Local Body Services", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
    ],
  },
  {
    icon: "⚡",
    title: "Utility Services",
    color: "#f57f17",
    chargeModel: "₹5–₹10",
    count: 25,
    services: [
      { name: "Electricity Bill", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Water Bill", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Gas Booking", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "LPG Refill", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Mobile Recharge", govtFee: "-", serviceCharge: "₹5", total: "-" },
      { name: "DTH Recharge", govtFee: "-", serviceCharge: "₹5", total: "-" },
      { name: "Broadband Recharge", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Landline Bill", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Cable TV", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Electricity New Connection", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Water New Connection", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Complaint Registration", govtFee: "Free", serviceCharge: "₹10", total: "₹10" },
      { name: "Meter Change", govtFee: "₹200", serviceCharge: "₹30", total: "₹230" },
      { name: "Bill Correction", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Smart Meter Recharge", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Solar Registration", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "EB Name Change", govtFee: "₹100", serviceCharge: "₹30", total: "₹130" },
      { name: "Disconnection Request", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Reconnection Request", govtFee: "₹100", serviceCharge: "₹30", total: "₹130" },
      { name: "Utility Certificate", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Prepaid Recharge", govtFee: "-", serviceCharge: "₹5", total: "-" },
      { name: "Online Complaint", govtFee: "Free", serviceCharge: "₹10", total: "₹10" },
      { name: "Service Request", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Bill History", govtFee: "-", serviceCharge: "₹10", total: "-" },
      { name: "Payment Receipt", govtFee: "-", serviceCharge: "₹10", total: "-" },
    ],
  },
  {
    icon: "🎓",
    title: "Education Services",
    color: "#00695c",
    chargeModel: "₹30–₹50",
    count: 30,
    services: [
      { name: "Scholarship Apply", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "NSP Registration", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Exam Registration", govtFee: "₹100", serviceCharge: "₹40", total: "₹140" },
      { name: "Hall Ticket Download", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Result Check", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Certificate Download", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Migration Certificate", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Transfer Certificate", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
      { name: "Bonafide Certificate", govtFee: "₹20", serviceCharge: "₹40", total: "₹60" },
      { name: "Student ID", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Fee Payment", govtFee: "-", serviceCharge: "₹20", total: "-" },
      { name: "Admission Apply", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Entrance Exam", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Competitive Exam Apply", govtFee: "Variable", serviceCharge: "₹50", total: "-" },
      { name: "Skill India Registration", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "NSDC Courses", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Online Course Enrollment", govtFee: "-", serviceCharge: "₹30", total: "₹30" },
      { name: "Digital Certificate", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Marklist Download", govtFee: "Free", serviceCharge: "₹20", total: "₹20" },
      { name: "Revaluation Apply", govtFee: "₹500", serviceCharge: "₹50", total: "₹550" },
      { name: "Duplicate Certificate", govtFee: "₹100", serviceCharge: "₹40", total: "₹140" },
      { name: "Internship Apply", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Training Registration", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Placement Registration", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Education Loan", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Student Insurance", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Study Abroad Apply", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Language Course", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Online Coaching", govtFee: "-", serviceCharge: "₹50", total: "₹50" },
      { name: "Verification Services", govtFee: "₹50", serviceCharge: "₹40", total: "₹90" },
    ],
  },
  {
    icon: "🧑‍🌾",
    title: "Agriculture",
    color: "#33691e",
    chargeModel: "₹40–₹100",
    count: 20,
    services: [
      { name: "Farmer Registration", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Subsidy Apply", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Crop Insurance", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
      { name: "Soil Testing", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Seed Distribution", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
      { name: "Fertilizer Subsidy", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Equipment Subsidy", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Irrigation Scheme", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Dairy Scheme", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Poultry Scheme", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Fisheries Scheme", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Organic Farming", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Crop Loan", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
      { name: "Kisan Credit Card", govtFee: "Free", serviceCharge: "₹50", total: "₹50" },
      { name: "Market Price Check", govtFee: "Free", serviceCharge: "₹10", total: "₹10" },
      { name: "Weather Info", govtFee: "Free", serviceCharge: "₹10", total: "₹10" },
      { name: "Pest Control Service", govtFee: "Free", serviceCharge: "₹40", total: "₹40" },
      { name: "Agri Loan", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
      { name: "Export Registration", govtFee: "₹500", serviceCharge: "₹100", total: "₹600" },
      { name: "Farmer ID", govtFee: "Free", serviceCharge: "₹30", total: "₹30" },
    ],
  },
  {
    icon: "🏭",
    title: "Business & Licensing",
    color: "#37474f",
    chargeModel: "₹300–₹3500",
    count: 40,
    services: [
      { name: "GST Registration", govtFee: "Free", serviceCharge: "₹500", total: "₹500" },
      { name: "GST Filing", govtFee: "Free", serviceCharge: "₹300", total: "₹300" },
      { name: "MSME Registration", govtFee: "Free", serviceCharge: "₹300", total: "₹300" },
      { name: "Udyam Registration", govtFee: "Free", serviceCharge: "₹300", total: "₹300" },
      { name: "FSSAI License", govtFee: "₹100", serviceCharge: "₹500", total: "₹600" },
      { name: "Trade License", govtFee: "₹500", serviceCharge: "₹300", total: "₹800" },
      { name: "Company Registration", govtFee: "₹1000", serviceCharge: "₹3000", total: "₹4000" },
      { name: "Partnership Registration", govtFee: "₹500", serviceCharge: "₹1500", total: "₹2000" },
      { name: "LLP Registration", govtFee: "₹500", serviceCharge: "₹2000", total: "₹2500" },
      { name: "Startup Registration", govtFee: "Free", serviceCharge: "₹500", total: "₹500" },
      { name: "Import Export Code", govtFee: "₹500", serviceCharge: "₹500", total: "₹1000" },
      { name: "Shop Act License", govtFee: "₹200", serviceCharge: "₹300", total: "₹500" },
      { name: "Professional Tax", govtFee: "₹200", serviceCharge: "₹200", total: "₹400" },
      { name: "Trademark Apply", govtFee: "₹4500", serviceCharge: "₹1500", total: "₹6000" },
      { name: "ISO Certificate", govtFee: "-", serviceCharge: "₹5000", total: "₹5000" },
      { name: "Digital Signature", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "eTender Apply", govtFee: "Variable", serviceCharge: "₹500", total: "-" },
      { name: "Project Report", govtFee: "-", serviceCharge: "₹3500", total: "₹3500" },
      { name: "Business Loan", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Invoice Generation", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
      { name: "Accounting Service", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Payroll Service", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Compliance Filing", govtFee: "-", serviceCharge: "₹300", total: "₹300" },
      { name: "ROC Filing", govtFee: "₹200", serviceCharge: "₹500", total: "₹700" },
      { name: "Annual Return", govtFee: "₹200", serviceCharge: "₹500", total: "₹700" },
      { name: "Audit Support", govtFee: "-", serviceCharge: "₹1000", total: "₹1000" },
      { name: "Legal Drafting", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Agreement Drafting", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Consultancy Service", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Franchise Setup", govtFee: "-", serviceCharge: "₹2000", total: "₹2000" },
      { name: "Website Development", govtFee: "-", serviceCharge: "₹5000", total: "₹5000" },
      { name: "Domain Registration", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Hosting Service", govtFee: "-", serviceCharge: "₹1000", total: "₹1000" },
      { name: "Digital Marketing", govtFee: "-", serviceCharge: "₹2000", total: "₹2000" },
      { name: "Social Media Setup", govtFee: "-", serviceCharge: "₹1000", total: "₹1000" },
      { name: "Logo Design", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
      { name: "Business Card", govtFee: "-", serviceCharge: "₹200", total: "₹200" },
      { name: "Printing Service", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
      { name: "Branding Service", govtFee: "-", serviceCharge: "₹1000", total: "₹1000" },
      { name: "Startup Support", govtFee: "-", serviceCharge: "₹500", total: "₹500" },
    ],
  },
  {
    icon: "🎟️",
    title: "Travel & Ticketing",
    color: "#ad1457",
    chargeModel: "₹30–₹200",
    count: 15,
    services: [
      { name: "Train Ticket", govtFee: "-", serviceCharge: "₹30", total: "-" },
      { name: "Flight Ticket", govtFee: "-", serviceCharge: "₹200", total: "-" },
      { name: "Bus Ticket", govtFee: "-", serviceCharge: "₹30", total: "-" },
      { name: "Hotel Booking", govtFee: "-", serviceCharge: "₹100", total: "-" },
      { name: "Tour Package", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Visa Apply", govtFee: "Variable", serviceCharge: "₹500", total: "-" },
      { name: "Passport Support", govtFee: "₹1500", serviceCharge: "₹100", total: "₹1600" },
      { name: "Travel Insurance", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Holiday Package", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "Taxi Booking", govtFee: "-", serviceCharge: "₹50", total: "-" },
      { name: "Car Rental", govtFee: "-", serviceCharge: "₹100", total: "-" },
      { name: "Pilgrimage Package", govtFee: "-", serviceCharge: "Commission", total: "-" },
      { name: "International Ticket", govtFee: "-", serviceCharge: "₹500", total: "-" },
      { name: "Cruise Booking", govtFee: "-", serviceCharge: "₹500", total: "-" },
      { name: "Travel Consultation", govtFee: "-", serviceCharge: "₹100", total: "₹100" },
    ],
  },
];

// Summary for the chart
const SUMMARY = [
  { category: "e-District", charge: "₹40", color: "#1a237e" },
  { category: "Identity (PAN)", charge: "₹250", color: "#e65100" },
  { category: "Health", charge: "₹20–50", color: "#2e7d32" },
  { category: "Banking", charge: "Commission", color: "#1565c0" },
  { category: "Transport", charge: "₹50", color: "#c62828" },
  { category: "LSGD", charge: "₹30–200", color: "#4527a0" },
  { category: "Utility", charge: "₹5–10", color: "#f57f17" },
  { category: "Education", charge: "₹30–50", color: "#00695c" },
  { category: "Agriculture", charge: "₹40–100", color: "#33691e" },
  { category: "Business", charge: "₹300–3500", color: "#37474f" },
  { category: "Travel", charge: "₹30–200", color: "#ad1457" },
];

export default function ServiceBilling() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const totalServices = CATEGORIES.reduce((a, c) => a + c.count, 0);

  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    services: cat.services.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(
    (cat) =>
      cat.services.length > 0 &&
      (!activeCategory || cat.title === activeCategory)
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header Image */}
      <div className="rounded-xl overflow-hidden shadow-lg">
        <img
          src={billingHeader}
          alt="ജന സേവന കേന്ദ്രം - Customer Service Point"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Title & Stats */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold text-foreground">
          KERALA ONLINE SERVICES – FULL MASTER LIST
        </h2>
        <p className="text-muted-foreground">
          Complete service charges & billing reference • <span className="font-bold text-primary">{totalServices}+ Services</span>
        </p>
      </div>

      {/* Summary Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">💰 Pricing Model Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {SUMMARY.map((s) => (
              <button
                key={s.category}
                onClick={() =>
                  setActiveCategory(
                    activeCategory === CATEGORIES.find((c) => c.title.startsWith(s.category.split(" ")[0]))?.title
                      ? null
                      : CATEGORIES.find((c) => c.title.startsWith(s.category.split(" ")[0]))?.title || null
                  )
                }
                className="rounded-lg p-3 text-center border transition-all hover:scale-105"
                style={{
                  borderColor: s.color + "40",
                  backgroundColor: s.color + "10",
                }}
              >
                <div className="text-xs font-bold" style={{ color: s.color }}>
                  {s.category}
                </div>
                <div className="text-lg font-extrabold mt-1" style={{ color: s.color }}>
                  {s.charge}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">📊 Service Distribution by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => (
              <div key={cat.title} className="flex items-center gap-3">
                <span className="text-sm w-8 text-center">{cat.icon}</span>
                <span className="text-xs font-medium w-36 truncate">{cat.title}</span>
                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center pl-2 text-white text-xs font-bold transition-all"
                    style={{
                      width: `${(cat.count / 50) * 100}%`,
                      backgroundColor: cat.color,
                      minWidth: "40px",
                    }}
                  >
                    {cat.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {activeCategory && (
          <Badge
            variant="secondary"
            className="cursor-pointer self-start px-4 py-2"
            onClick={() => setActiveCategory(null)}
          >
            {activeCategory} ✕
          </Badge>
        )}
      </div>

      {/* Category Tables */}
      {filteredCategories.map((cat) => (
        <Card key={cat.title} className="overflow-hidden">
          <CardHeader
            className="py-3 px-4 border-b"
            style={{ backgroundColor: cat.color + "10", borderColor: cat.color + "30" }}
          >
            <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: cat.color }}>
              <span>{cat.icon}</span>
              {cat.title}
              <Badge variant="outline" className="ml-auto text-[10px]">
                {cat.chargeModel}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {cat.count} services
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: cat.color + "08" }}>
                    <TableHead className="text-xs font-bold w-8">#</TableHead>
                    <TableHead className="text-xs font-bold">Service Name</TableHead>
                    <TableHead className="text-xs font-bold text-right">Govt Fee</TableHead>
                    <TableHead className="text-xs font-bold text-right">Service Charge</TableHead>
                    <TableHead className="text-xs font-bold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cat.services.map((s, i) => (
                    <TableRow key={s.name} className="hover:bg-muted/50">
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs text-right">{s.govtFee}</TableCell>
                      <TableCell className="text-xs text-right font-semibold text-primary">{s.serviceCharge}</TableCell>
                      <TableCell className="text-xs text-right font-bold">{s.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No services found matching "{search}"
        </div>
      )}
    </div>
  );
}
