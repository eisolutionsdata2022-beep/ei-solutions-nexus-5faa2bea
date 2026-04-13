/**
 * Server function to call the external Ambika Recharge API
 * via the eisolutionseprint.com backend.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const rechargeInputSchema = z.object({
  serviceType: z.string().min(1).max(50),
  operator: z.string().min(1).max(50),
  mobileNumber: z.string().min(10).max(15).regex(/^\d+$/),
  amount: z.number().min(1).max(100000),
  transactionId: z.string().min(1).max(100),
});

export interface AmbikaApiResponse {
  success: boolean;
  status: "success" | "pending" | "failed";
  apiTransactionId?: string;
  operatorRef?: string;
  message: string;
  rawResponse?: Record<string, string | number | boolean | null>;
}

/**
 * Calls the external Ambika Recharge API through eisolutionseprint.com backend.
 * Runs server-side only to protect API credentials.
 */
export const callAmbikaRechargeApi = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof rechargeInputSchema>) =>
    rechargeInputSchema.parse(input)
  )
  .handler(async ({ data }): Promise<AmbikaApiResponse> => {
    const baseUrl = process.env.AMBIKA_API_BASE_URL;
    const userId = process.env.AMBIKA_API_USER_ID;
    const apiKey = process.env.AMBIKA_API_KEY;

    if (!baseUrl || !userId || !apiKey) {
      console.error("Ambika API credentials not configured");
      return {
        success: false,
        status: "failed",
        message: "API configuration error. Contact admin.",
      };
    }

    // Map service types to Ambika API action codes
    const actionMap: Record<string, string> = {
      mobile_recharge: "recharge",
      dth: "dth",
      electricity: "bbps",
      water: "bbps",
      lpg: "bbps",
      loan_repayment: "bbps",
      google_play: "recharge",
      fastag: "bbps",
    };

    const action = actionMap[data.serviceType] || "recharge";

    try {
      const params = new URLSearchParams({
        userid: userId,
        token: apiKey,
        action: action,
        operator: data.operator,
        number: data.mobileNumber,
        amount: String(data.amount),
        orderid: data.transactionId,
      });

      const apiUrl = `${baseUrl}?${params.toString()}`;

      console.log(
        `[Ambika API] Calling: action=${action}, operator=${data.operator}, number=${data.mobileNumber}, amount=${data.amount}, orderid=${data.transactionId}`
      );

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(apiUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`[Ambika API] HTTP error: ${response.status}`);
        return {
          success: false,
          status: "failed",
          message: `API returned HTTP ${response.status}`,
        };
      }

      const raw = await response.json();
      console.log(`[Ambika API] Response:`, JSON.stringify(raw));

      // Parse Ambika response — adapt to their actual response format
      // Common formats: { status: "SUCCESS/FAILED/PENDING", txnid, message }
      const apiStatus = (
        raw.status || raw.Status || ""
      )
        .toString()
        .toUpperCase();

      if (apiStatus === "SUCCESS" || apiStatus === "1" || apiStatus === "TRUE") {
        return {
          success: true,
          status: "success",
          apiTransactionId: raw.txnid || raw.transid || raw.rpid || "",
          operatorRef: raw.opid || raw.operatorid || "",
          message: raw.message || raw.msg || "Recharge successful",
          rawResponse: raw,
        };
      } else if (apiStatus === "PENDING" || apiStatus === "2") {
        return {
          success: true,
          status: "pending",
          apiTransactionId: raw.txnid || raw.transid || "",
          message: raw.message || raw.msg || "Transaction pending",
          rawResponse: raw,
        };
      } else {
        return {
          success: false,
          status: "failed",
          message: raw.message || raw.msg || "Recharge failed",
          rawResponse: raw,
        };
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "API request timed out (30s)"
          : err instanceof Error
            ? err.message
            : "Unknown API error";

      console.error(`[Ambika API] Error: ${message}`);
      return {
        success: false,
        status: "failed",
        message: `API error: ${message}`,
      };
    }
  });
