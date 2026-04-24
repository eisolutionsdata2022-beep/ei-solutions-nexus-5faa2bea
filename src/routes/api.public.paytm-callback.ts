/**
 * Paytm v2 — public callback endpoint.
 *
 * Paytm POSTs back to this URL after Checkout (redirect) flow completes.
 * We:
 *   1. Verify CHECKSUMHASH against `PAYTM_MERCHANT_KEY`
 *   2. Run a status-query to Paytm (defense in depth — never trust form data alone)
 *   3. Credit wallet atomically on success
 *   4. Redirect user back to /retailer/wallet?paytm=success|failed
 */
import { createFileRoute } from "@tanstack/react-router";
import { runPaytmStatusCheck } from "@/lib/paytm.functions";

export const Route = createFileRoute("/api/public/paytm-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const merchantKey = process.env.PAYTM_MERCHANT_KEY ?? "";
        if (!merchantKey) {
          return redirectToWallet("error", "Paytm not configured");
        }

        // Paytm sends application/x-www-form-urlencoded
        const form = await request.formData();
        const data: Record<string, string> = {};
        form.forEach((value, key) => {
          data[key] = String(value);
        });

        const orderId = data["ORDERID"] || data["ORDER_ID"] || "";
        if (!orderId) return redirectToWallet("failed", "Missing order");

        // 1. Verify checksum (signature) — dynamic import keeps server-only code out of client bundle
        const { verifyCheckoutCallback } = await import("@/lib/paytm-checksum.server");
        const valid = verifyCheckoutCallback(data, merchantKey);
        if (!valid) {
          console.error("[paytm-callback] Invalid checksum for order", orderId);
          return redirectToWallet("failed", "Invalid signature");
        }

        // 2. Defense in depth — query Paytm directly + credit wallet
        try {
          const result = await runPaytmStatusCheck(orderId, null);
          if (result.status === "success") {
            return redirectToWallet("success", `Credited ₹${result.creditAmount}`);
          }
          if (result.status === "failed") {
            return redirectToWallet("failed", result.message ?? "Transaction failed");
          }
          return redirectToWallet("pending", "Payment is being verified");
        } catch (err) {
          console.error("[paytm-callback] Status check failed:", err);
          return redirectToWallet("error", err instanceof Error ? err.message : "Server error");
        }
      },

      // Some Paytm flows respond with GET — accept and forward
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("ORDERID") ?? "";
        if (orderId) {
          try {
            await runPaytmStatusCheck(orderId, null);
          } catch {
            /* ignore — user redirect still happens */
          }
        }
        return redirectToWallet("pending", "Verifying…");
      },
    },
  },
});

function redirectToWallet(status: string, message: string): Response {
  const url = `/retailer/wallet?paytm=${encodeURIComponent(status)}&msg=${encodeURIComponent(message)}`;
  return new Response(null, { status: 303, headers: { Location: url } });
}
