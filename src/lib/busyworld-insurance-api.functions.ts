/**
 * Server function to call the BusyWorld Insurance API
 * Endpoints: uclindiaucl.xyz
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";

const insuranceInputSchema = z.object({
  action: z.enum(["balance_check", "balance_deduct"]),
  operatorId: z.string().min(1).max(10),
  subscriberId: z.string().min(1).max(50),
  amount: z.number().min(10).max(100000),
  transactionId: z.string().min(1).max(100).optional(),
});

export interface InsuranceApiResponse {
  success: boolean;
  status: "success" | "pending" | "failed";
  balance?: number;
  message: string;
  transactionId?: string;
  rawResponse?: Record<string, string | number | boolean | null>;
}

const INSURANCE_API_URLS = {
  balance_check: "https://uclindiaucl.xyz/portallogin/insurance_bal_chk.php",
  balance_deduct: "https://uclindiaucl.xyz/portallogin/insurance_bal_deduct.php",
  webhook: "https://uclindiaucl.xyz/portallogin/insurance_bal_webhook.php",
};

/**
 * Parse XML response from BusyWorld API
 */
function parseXmlResponse(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tags = ["STATUS", "MSG", "BAL", "ERRORCODE", "ACCOUNT", "AMOUNT", "RPID", "AGENTID", "OPID", "TXNID"];
  for (const tag of tags) {
    const match = text.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"));
    if (match) result[tag] = match[1].trim();
  }
  return result;
}

/**
 * Calls the BusyWorld Insurance API.
 * Runs server-side only to protect API credentials.
 */
export const callInsuranceApi = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: unknown) => insuranceInputSchema.parse(input))
  .handler(async ({ data }): Promise<InsuranceApiResponse> => {
    const apiToken = process.env.BUSYWORLD_API_TOKEN;
    if (!apiToken) {
      console.error("[Insurance API] BUSYWORLD_API_TOKEN not configured");
      return {
        success: false,
        status: "failed",
        message: "Insurance API not configured. Contact admin.",
      };
    }

    const url = INSURANCE_API_URLS[data.action];

    const params = new URLSearchParams({
      token: apiToken,
      operator: data.operatorId,
      account: data.subscriberId,
      amount: String(data.amount),
      ...(data.transactionId ? { txnid: data.transactionId } : {}),
    });

    try {
      console.log(`[Insurance API] ${data.action}: operator=${data.operatorId}, amount=${data.amount}`);

      const res = await fetch(`${url}?${params.toString()}`, {
        method: "GET",
        headers: { "Accept": "application/json, text/xml, text/html" },
        signal: AbortSignal.timeout(30000),
      });

      const text = await res.text();
      console.log(`[Insurance API] Response status: ${res.status}, body length: ${text.length}`);

      // Try JSON first
      let parsed: Record<string, string> = {};
      try {
        const json = JSON.parse(text);
        parsed = Object.fromEntries(
          Object.entries(json).map(([k, v]) => [k.toUpperCase(), String(v ?? "")])
        );
      } catch {
        // Fall back to XML parsing
        parsed = parseXmlResponse(text);
      }

      if (!parsed.STATUS) {
        console.error("[Insurance API] No STATUS in response:", text.substring(0, 500));
        return {
          success: false,
          status: "failed",
          message: "Invalid API response format",
          rawResponse: parsed as any,
        };
      }

      const statusUpper = parsed.STATUS.toUpperCase();

      if (statusUpper === "SUCCESS" || statusUpper === "1" || statusUpper === "TRUE") {
        return {
          success: true,
          status: "success",
          balance: parsed.BAL ? parseFloat(parsed.BAL) : undefined,
          message: parsed.MSG || "Transaction successful",
          transactionId: parsed.RPID || parsed.TXNID || undefined,
          rawResponse: parsed as any,
        };
      }

      if (statusUpper === "PENDING" || statusUpper === "2") {
        return {
          success: true,
          status: "pending",
          message: parsed.MSG || "Transaction pending",
          transactionId: parsed.RPID || parsed.TXNID || undefined,
          rawResponse: parsed as any,
        };
      }

      return {
        success: false,
        status: "failed",
        message: parsed.MSG || parsed.ERRORCODE || "Transaction failed",
        rawResponse: parsed as any,
      };
    } catch (err) {
      console.error("[Insurance API] Request failed:", err);
      return {
        success: false,
        status: "failed",
        message: err instanceof Error ? err.message : "Insurance API request failed",
      };
    }
  });
