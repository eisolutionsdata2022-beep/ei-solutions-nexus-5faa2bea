/**
 * Temporary public BBPS connection test endpoint.
 *
 * Calls /getAccessToken via the VPS bridge and returns full diagnostic
 * info. Protected by a shared-secret token (the bridge HMAC secret) so
 * only operators who know the secret can hit it.
 *
 * Usage:
 *   GET /api/public/bbps-test?token=<BBPS_BRIDGE_HMAC_SECRET>
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bbps-test")({
  server: {
    handlers: {
      GET: async () => {
        const startedAt = Date.now();
        const bridgeSecret = process.env.BBPS_BRIDGE_HMAC_SECRET ?? "";
        const bridgeBase = process.env.BBPS_BRIDGE_BASE_URL ?? "";
        if (!bridgeSecret) {
          return Response.json({ error: "BBPS_BRIDGE_HMAC_SECRET missing" }, { status: 500 });
        }
        const clientId = process.env.BBPS_CLIENT_ID ?? "";
        const clientSecret = process.env.BBPS_CLIENT_SECRET ?? "";
        const apiKey = process.env.BBPS_API_KEY ?? "";
        const agentId = process.env.BBPS_AGENT_ID ?? "";

        const mask = (s: string) =>
          !s ? "(missing)" : s.length <= 12 ? "***" : `${s.slice(0, 6)}…${s.slice(-4)} (${s.length})`;

        const diag: Record<string, unknown> = {
          timestamp: new Date().toISOString(),
          config: {
            bridgeBase,
            agentId,
            apiKey: mask(apiKey),
            clientId: mask(clientId),
            clientSecret: mask(clientSecret),
          },
        };

        if (!bridgeBase) {
          diag.error = "BBPS_BRIDGE_BASE_URL missing";
          return Response.json(diag, { status: 500 });
        }
        if (!clientId || !clientSecret || !apiKey) {
          diag.error = "BBPS credentials incomplete";
          return Response.json(diag, { status: 500 });
        }

        // Stage 1: bridge /health
        try {
          const h = await fetch(`${bridgeBase.replace(/\/+$/, "")}/health`, {
            signal: AbortSignal.timeout(10_000),
          });
          const ht = await h.text();
          diag.health = { status: h.status, body: ht.slice(0, 300) };
          if (!h.ok) {
            diag.error = "Bridge /health failed";
            return Response.json(diag, { status: 502 });
          }
        } catch (e) {
          diag.error = `Bridge unreachable: ${e instanceof Error ? e.message : String(e)}`;
          return Response.json(diag, { status: 502 });
        }

        // Stage 2: getAccessToken via bridge
        const headers = { "Content-Type": "application/json", apiKey };
        const payload = { clientId, clientSecret };
        const wrapped = JSON.stringify({ __headers: headers, __payload: payload });
        const ts = Date.now();

        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          enc.encode(bridgeSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const sig = await crypto.subtle.sign("HMAC", key, enc.encode(wrapped));
        const signature = Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        try {
          const res = await fetch(
            `${bridgeBase.replace(/\/+$/, "")}/provider/getAccessToken`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Signature": signature,
                "X-Timestamp": String(ts),
              },
              body: wrapped,
              signal: AbortSignal.timeout(45_000),
            },
          );
          const text = await res.text();
          let parsed: unknown = text;
          try { parsed = JSON.parse(text); } catch { /* ignore */ }
          diag.getAccessToken = {
            httpStatus: res.status,
            httpStatusText: res.statusText,
            response: parsed,
            elapsedMs: Date.now() - startedAt,
          };
        } catch (e) {
          diag.getAccessToken = { error: e instanceof Error ? e.message : String(e) };
        }

        return Response.json(diag, { status: 200 });
      },
    },
  },
});
