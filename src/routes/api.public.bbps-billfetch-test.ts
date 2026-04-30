/**
 * End-to-end BBPS billFetch live diagnostic.
 *
 * Chains:
 *   1. getAccessToken
 *   2. /billpay/bill-category   → pick first category (or ?category=)
 *   3. /billpay/biller-info     → pick first biller   (or ?billerId=)
 *   4. /billpay/customer-params → derive paramName(s)
 *   5. /billpay/bill-fetch      → use ?value= (default "1234567890")
 *
 * Every stage logs the full outbound payload + raw provider response so we
 * can forward to the BBPS provider for diagnosis.
 *
 * Usage:
 *   GET /api/public/bbps-billfetch-test?category=Electricity&billerId=KSEBL00000KER01&value=1234567890
 */
import { createFileRoute } from "@tanstack/react-router";

interface BridgeResp {
  success?: boolean;
  status?: number;
  statusText?: string;
  body?: unknown;
  error?: string;
}

export const Route = createFileRoute("/api/public/bbps-billfetch-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const wantCategory = url.searchParams.get("category");
        const wantBillerId = url.searchParams.get("billerId");
        const wantValue = url.searchParams.get("value") ?? "1234567890";

        const bridgeSecret = process.env.BBPS_BRIDGE_HMAC_SECRET ?? "";
        const bridgeBase = (process.env.BBPS_BRIDGE_BASE_URL ?? "").replace(/\/+$/, "");
        const clientId = process.env.BBPS_CLIENT_ID ?? "";
        const clientSecret = process.env.BBPS_CLIENT_SECRET ?? "";
        const apiKey = process.env.BBPS_API_KEY ?? "";
        const agentId = process.env.BBPS_AGENT_ID ?? "";
        const lat = process.env.BBPS_LATITUDE ?? "12.9716";
        const lng = process.env.BBPS_LONGITUDE ?? "77.5946";

        if (!bridgeSecret || !bridgeBase || !clientId || !clientSecret || !apiKey || !agentId) {
          return Response.json({ error: "BBPS env incomplete" }, { status: 500 });
        }

        const mask = (s: string) =>
          !s ? "(missing)" : s.length <= 12 ? "***" : `${s.slice(0, 6)}…${s.slice(-4)} (${s.length})`;

        const diag: Record<string, unknown> = {
          timestamp: new Date().toISOString(),
          inputs: { wantCategory, wantBillerId, wantValue },
          config: {
            bridgeBase,
            agentId,
            apiKey: mask(apiKey),
            clientId: mask(clientId),
            clientSecret: mask(clientSecret),
            lat,
            lng,
          },
        };

        const enc = new TextEncoder();
        const hmacKey = await crypto.subtle.importKey(
          "raw", enc.encode(bridgeSecret),
          { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
        );
        const sign = async (msg: string) => {
          const sig = await crypto.subtle.sign("HMAC", hmacKey, enc.encode(msg));
          return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
        };

        async function callProvider(
          apiPath: string,
          headers: Record<string, string>,
          payload: Record<string, unknown>,
        ): Promise<{ httpStatus: number; raw: string; parsed: BridgeResp; elapsedMs: number; outboundUrl: string }> {
          const wrapped = JSON.stringify({ __headers: headers, __payload: payload });
          const ts = Date.now();
          const signature = await sign(wrapped);
          const outboundUrl = `${bridgeBase}/provider/${apiPath.replace(/^\/+/, "")}`;
          const t0 = Date.now();
          const res = await fetch(outboundUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Signature": signature,
              "X-Timestamp": String(ts),
            },
            body: wrapped,
            signal: AbortSignal.timeout(60_000),
          });
          const raw = await res.text();
          let parsed: BridgeResp = {};
          try { parsed = JSON.parse(raw); } catch { parsed = { body: raw }; }
          return { httpStatus: res.status, raw, parsed, elapsedMs: Date.now() - t0, outboundUrl };
        }

        // ── Stage 1: getAccessToken ─────────────────────────────
        const tokenHeaders = { "Content-Type": "application/json", apiKey };
        const tokenPayload = { clientId, clientSecret };
        let token = "", accessId = "", accessCode = "";
        try {
          const r = await callProvider("getAccessToken", tokenHeaders, tokenPayload);
          diag.stage1_getAccessToken = {
            outboundUrl: r.outboundUrl,
            requestPayload: tokenPayload,
            httpStatus: r.httpStatus,
            elapsedMs: r.elapsedMs,
            response: r.parsed,
          };
          const body = r.parsed.body as { jwt_token?: string; access_id?: string; access_code?: string; success?: boolean; message?: string } | undefined;
          if (!r.parsed.success || !body?.jwt_token) {
            diag.error = `getAccessToken failed: ${body?.message ?? "no token"}`;
            return Response.json(diag, { status: 200 });
          }
          token = body.jwt_token;
          accessId = body.access_id ?? "";
          accessCode = body.access_code ?? "";
        } catch (e) {
          diag.stage1_getAccessToken = { error: e instanceof Error ? e.message : String(e) };
          return Response.json(diag, { status: 200 });
        }

        const authHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          apiKey,
          Authorization: `Bearer ${token}`,
          authorization: `Bearer ${token}`,
          accessToken: token,
          access_token: token,
          jwt_token: token,
          access_id: accessId,
          accessId: accessId,
          access_code: accessCode,
          accessCode: accessCode,
          latitude: lat,
          longitude: lng,
        };
        const authPayloadBase = {
          accessToken: token,
          jwt_token: token,
          access_id: accessId,
          accessId,
          access_code: accessCode,
          accessCode,
        };

        // ── Stage 2: bill-category ──────────────────────────────
        let chosenCategory = wantCategory ?? "";
        try {
          const r = await callProvider("V2/billpay/bill-category", authHeaders, {
            ...authPayloadBase, agent: agentId,
          });
          const body = r.parsed.body as { success?: boolean; data?: Array<{ name?: string; categoryName?: string }>; message?: string } | undefined;
          const cats = body?.data ?? [];
          diag.stage2_billCategory = {
            outboundUrl: r.outboundUrl,
            requestPayload: { agent: agentId, "...auth": "(token+ids)" },
            httpStatus: r.httpStatus,
            elapsedMs: r.elapsedMs,
            providerSuccess: body?.success,
            providerMessage: body?.message,
            categoryCount: cats.length,
            firstFew: cats.slice(0, 5),
            rawResponseBody: r.parsed.body,
          };
          if (!chosenCategory && cats.length > 0) {
            chosenCategory = cats[0].name ?? cats[0].categoryName ?? "";
          }
          if (!chosenCategory) {
            diag.error = "No category found";
            return Response.json(diag, { status: 200 });
          }
        } catch (e) {
          diag.stage2_billCategory = { error: e instanceof Error ? e.message : String(e) };
          return Response.json(diag, { status: 200 });
        }

        // ── Stage 3: biller-info ────────────────────────────────
        let chosenBillerId = wantBillerId ?? "";
        try {
          const r = await callProvider("V2/billpay/biller-info", authHeaders, {
            ...authPayloadBase, agent: agentId, category: chosenCategory,
          });
          const body = r.parsed.body as { success?: boolean; biller?: Array<{ id?: string; billerid?: string; name?: string; billerName?: string }>; message?: string } | undefined;
          const billers = body?.biller ?? [];
          diag.stage3_billerInfo = {
            outboundUrl: r.outboundUrl,
            requestPayload: { agent: agentId, category: chosenCategory },
            httpStatus: r.httpStatus,
            elapsedMs: r.elapsedMs,
            providerSuccess: body?.success,
            providerMessage: body?.message,
            billerCount: billers.length,
            firstFew: billers.slice(0, 5),
            chosenCategory,
          };
          if (!chosenBillerId && billers.length > 0) {
            chosenBillerId = billers[0].id ?? billers[0].billerid ?? "";
          }
          if (!chosenBillerId) {
            diag.error = `No biller for category ${chosenCategory}`;
            return Response.json(diag, { status: 200 });
          }
        } catch (e) {
          diag.stage3_billerInfo = { error: e instanceof Error ? e.message : String(e) };
          return Response.json(diag, { status: 200 });
        }

        // ── Stage 4: customer-params ────────────────────────────
        let paramNames: string[] = [];
        try {
          const r = await callProvider("V2/billpay/customer-params", authHeaders, {
            ...authPayloadBase, agent: agentId, billerid: chosenBillerId,
          });
          const body = r.parsed.body as { success?: boolean; param?: Array<{ name?: string; paramName?: string }>; mode?: number; message?: string } | undefined;
          const params = body?.param ?? [];
          paramNames = params.map((p) => p.name ?? p.paramName ?? "").filter(Boolean);
          diag.stage4_customerParams = {
            outboundUrl: r.outboundUrl,
            requestPayload: { agent: agentId, billerid: chosenBillerId },
            httpStatus: r.httpStatus,
            elapsedMs: r.elapsedMs,
            providerSuccess: body?.success,
            providerMessage: body?.message,
            mode: body?.mode,
            paramNames,
            rawResponseBody: r.parsed.body,
          };
          if (paramNames.length === 0) {
            diag.error = `No params for biller ${chosenBillerId}`;
            return Response.json(diag, { status: 200 });
          }
        } catch (e) {
          diag.stage4_customerParams = { error: e instanceof Error ? e.message : String(e) };
          return Response.json(diag, { status: 200 });
        }

        // ── Stage 5: bill-fetch ─────────────────────────────────
        const paramValues = paramNames.map((_, i) => (i === 0 ? wantValue : ""));
        const paramName = `{${paramNames.map((n) => `"${n}"`).join(",")}}`;
        const paramValue = `{${paramValues.map((v) => `"${v}"`).join(",")}}`;
        const fetchPayload = {
          ...authPayloadBase,
          agent: agentId,
          billerid: chosenBillerId,
          paramName,
          paramValue,
        };
        try {
          const r = await callProvider("V2/billpay/bill-fetch", authHeaders, fetchPayload);
          diag.stage5_billFetch = {
            outboundUrl: r.outboundUrl,
            requestPayload: {
              agent: agentId,
              billerid: chosenBillerId,
              paramName,
              paramValue,
              "...auth": "(token+ids)",
            },
            requestHeaders: {
              "Content-Type": "application/json",
              apiKey: mask(apiKey),
              Authorization: `Bearer ${token.slice(0, 20)}…`,
              latitude: lat,
              longitude: lng,
              access_id: accessId,
              access_code: accessCode,
            },
            httpStatus: r.httpStatus,
            elapsedMs: r.elapsedMs,
            rawResponseText: r.raw.slice(0, 2000),
            response: r.parsed,
          };
        } catch (e) {
          diag.stage5_billFetch = {
            error: e instanceof Error ? e.message : String(e),
            attemptedPayload: fetchPayload,
          };
        }

        return Response.json(diag, { status: 200 });
      },
    },
  },
});
