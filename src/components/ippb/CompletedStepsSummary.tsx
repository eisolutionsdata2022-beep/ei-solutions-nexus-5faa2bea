/**
 * Read-only summary of all completed steps' data — shown at top of every
 * active step card so both retailer and staff can verify what's been
 * captured so far. Mirrors the IPPB app's left-side filled-section list
 * with green ticks.
 */
import { Check } from "lucide-react";
import type { IPPBRequest } from "@/lib/ippb-types";

export function CompletedStepsSummary({ req }: { req: IPPBRequest }) {
  const items: { label: string; value?: string; ok: boolean }[] = [
    {
      label: "Mobile / Product / PAN",
      ok: !!req.basicDetails,
      value: req.basicDetails?.mobileNumber,
    },
    {
      label: "OTP Verified",
      ok: !!req.otp,
      value: req.otp,
    },
    {
      label: "Aadhaar",
      ok: !!req.aadhaar,
      value: req.aadhaar?.aadhaarNumber
        ? `XXXX-XXXX-${req.aadhaar.aadhaarNumber.slice(-4)}`
        : undefined,
    },
    {
      label: "Biometric 1 (Aadhaar Auth)",
      ok: !!req.biometric1,
      value: req.biometric1?.mode,
    },
    { label: "Personal Information", ok: !!req.personalInfo, value: req.personalInfo?.fullName },
    { label: "PAN & Address", ok: !!req.panAddress, value: req.panAddress?.panNumber },
    { label: "Nominee Details", ok: !!req.nomineeDetails, value: req.nomineeDetails?.nomineeName },
    { label: "Additional Information", ok: !!req.additionalInfo, value: req.additionalInfo?.occupation },
    {
      label: "Account Information",
      ok: !!req.accountInfo,
      value: req.accountInfo ? `₹${req.accountInfo.initialDeposit}` : undefined,
    },
    {
      label: "DBT Mapping",
      ok: !!req.dbtMapping,
      value: req.dbtMapping?.optIn ? "Opted-in & Verified" : "Skipped",
    },
    { label: "Biometric 2 (Data Match)", ok: !!req.biometric2, value: req.biometric2?.mode },
    { label: "Welcome Kit", ok: !!req.welcomeKit, value: req.welcomeKit?.kitId },
    { label: "Final Consent", ok: !!req.finalConsent?.accepted },
    { label: "Final Biometric", ok: !!req.biometricFinal, value: req.biometricFinal?.mode },
  ];

  const completed = items.filter((i) => i.ok);
  if (completed.length === 0) return null;

  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Completed Sections ({completed.length}/{items.length})
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {completed.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded px-2 py-1"
          >
            <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="font-medium text-green-900 truncate">{item.label}</span>
            {item.value && (
              <span className="ml-auto text-[10px] text-green-700 font-mono truncate max-w-[100px]">
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
