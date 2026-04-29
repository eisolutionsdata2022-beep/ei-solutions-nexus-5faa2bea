/**
 * Bharat Connect / AceNeoBank BBPS — server-only API client.
 *
 * Exposes the 6 documented endpoints as TanStack server functions, all
 * protected by `firebaseAuthMiddleware`. Credentials are stored as runtime
 * secrets and NEVER reach the browser. Token caching is in-memory per worker
 * (token TTL is taken from the `exp` claim of the JWT).
 *
 * Endpoints:
 *  - bbpsGetCategories       → POST /billpay/bill-category
 *  - bbpsGetBillers          → POST /billpay/biller-info
 *  - bbpsGetCustomerParams   → POST /billpay/customer-params
 *  - bbpsFetchBill           → POST /billpay/bill-fetch
 *  - bbpsValidateBill        → POST /billpay/bill-validation (no fetch flow)
 *  - bbpsPayBill             → POST /billpay/bill-pay (with wallet debit + atomic refund on failure)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { firebaseAuthMiddleware } from "./firebase-auth.middleware";
// Encryption helpers retained for future use; provider currently issues
// pre-encrypted credentials so we do not re-encrypt at request time.
// import { buildApiKeyHeader, encrypt } from "./bbps-encryption.server";
import type {
  BbpsCategory,
  BbpsBiller,
  BbpsCustomerParam,
  BbpsBillFetchResult,
  BbpsBillPayResult,
  BbpsTransaction,
} from "./bbps-types";
import { DEFAULT_BBPS_CONFIG } from "./bbps-types";
import {
  isMockMode,
  MOCK_CATEGORIES,
  mockBillersFor,
  mockParamsFor,
  mockBillFor,
  mockReceipt,
} from "./bbps-mock-data";

// ──────────────── Token cache ────────────────

interface TokenCache {
  accessToken: string;
  accessId: string;
  accessCode: string;
  expiresAt: number; // epoch ms
}
let tokenCache: TokenCache | null = null;

async function getProviderConfig(): Promise<{
  baseUrl: string;
  agentId: string;
  defaultFee: number;
  feeByCategory: Record<string, number>;
}> {
  const envAgent = process.env.BBPS_AGENT_ID;
  const envBase = process.env.BBPS_BASE_URL;
  // Try to read overrides from Firestore, but never fail the whole request if
  // rules block the read (the server uses the unauthenticated client SDK).
  let data: Partial<typeof DEFAULT_BBPS_CONFIG> = {};
  try {
    const snap = await getDoc(doc(db, "bbps_config/master"));
    if (snap.exists()) data = snap.data() as Partial<typeof DEFAULT_BBPS_CONFIG>;
  } catch (err) {
    console.warn("[BBPS] bbps_config/master read failed (using env defaults):", err instanceof Error ? err.message : err);
  }
  return {
    baseUrl: data.baseUrl ?? envBase ?? DEFAULT_BBPS_CONFIG.baseUrl,
    agentId: envAgent ?? data.agentId ?? DEFAULT_BBPS_CONFIG.agentId,
    defaultFee: data.defaultFee ?? DEFAULT_BBPS_CONFIG.defaultFee,
    feeByCategory: data.feeByCategory ?? {},
  };
}

/** Decode JWT exp without verifying the signature (provider issues, we just read). */
function jwtExpiryMs(jwt: string): number | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload.exp === "number") return payload.exp * 1000;
  } catch {
    return null;
  }
  return null;
}

async function getAccessToken(_baseUrl: string): Promise<TokenCache> {
  // Use cached token if still valid for ≥60s.
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache;
  }
  const clientId = process.env.BBPS_CLIENT_ID;
  const clientSecret = process.env.BBPS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Bharat Connect not configured — BBPS_CLIENT_ID / BBPS_CLIENT_SECRET missing. Add them in Lovable Cloud Settings.",
    );
  }

  // Provider issues credentials in pre-encrypted form (version-prefixed
   // base64 strings like "_v9...", "_PzJN..."). Send them as-is — do NOT
  // re-encrypt locally.
  let json: {
    success?: boolean;
    accessToken?: string;
    jwt_token?: string;
    access_id?: string;
    access_code?: string;
    message?: string;
  };
  try {
    json = await callBbps<typeof json>(
      "/getAccessToken",
      { clientId, clientSecret },
      { skipAuth: true },
    );
  } catch (err) {
    // Make sure a stale/failed token never lingers in the cache.
    tokenCache = null;
    throw err;
  }

  // Provider returns the JWT under `jwt_token` (legacy `accessToken` kept as fallback).
  const token = json.jwt_token ?? json.accessToken;
  if (!json.success || !token) {
    tokenCache = null;
    throw new Error(json.message ?? "Auth failed");
  }

  const expiresAt = jwtExpiryMs(token) ?? Date.now() + 30 * 60_000;
  tokenCache = {
    accessToken: token,
    accessId: json.access_id ?? "",
    accessCode: json.access_code ?? "",
    expiresAt,
  };
  return tokenCache;
}

/** Clear the in-memory access-token cache. Used by admin diagnostics after the
 *  provider clears a credential/whitelist issue, so the next call re-auths. */
export function _resetBbpsTokenCache() {
  tokenCache = null;
}

/** HMAC-SHA256 hex (used to sign bridge requests). */
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generic authenticated POST helper.
 *
 * Provider whitelists static IPs only. Cloudflare Workers has no fixed egress
 * IP, so all calls are routed through the VPS bridge (native/bbps-bridge-vps/)
 * when BBPS_BRIDGE_BASE_URL is configured. Set BBPS_DIRECT=1 to bypass the
 * bridge for local testing only.
 */
async function callBbps<T>(
  endpoint: string,
  body: Record<string, unknown>,
  opts: { skipAuth?: boolean } = {},
): Promise<T> {
  const cfg = await getProviderConfig();
  // Provider supplies the apiKey as a long pre-encrypted token — send it
  // verbatim in the `apiKey` header (no per-request re-encryption needed).
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apiKey: process.env.BBPS_API_KEY ?? "",
  };
  if (!opts.skipAuth) {
    const tok = await getAccessToken(cfg.baseUrl);
    headers.Authorization = `Bearer ${tok.accessToken}`;
    // AcePe-style providers also require these on every authenticated call.
    if (tok.accessId) headers.access_id = tok.accessId;
    if (tok.accessCode) headers.access_code = tok.accessCode;
    // Provider requires geo coords on every authenticated call (HTTP 411 otherwise).
    // Default to the VPS bridge region (Bangalore) — overridable via env.
    headers.latitude = process.env.BBPS_LATITUDE ?? "12.9716";
    headers.longitude = process.env.BBPS_LONGITUDE ?? "77.5946";
  }

  const bridgeBase = process.env.BBPS_BRIDGE_BASE_URL;
  const bridgeSecret = process.env.BBPS_BRIDGE_HMAC_SECRET;
  const direct = process.env.BBPS_DIRECT === "1";

  let res: Response;
  if (!direct && bridgeBase && bridgeSecret) {
    // Route via VPS bridge — provider sees the bridge's static IP.
    const apiPath = endpoint.replace(/^\/+/, "");
    const wrapped = JSON.stringify({ __headers: headers, __payload: body });
    const ts = Date.now();
    const signature = await hmacHex(bridgeSecret, wrapped);
    const url = `${bridgeBase.replace(/\/+$/, "")}/provider/${apiPath}`;
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
        "X-Timestamp": String(ts),
      },
      body: wrapped,
      signal: AbortSignal.timeout(60_000),
    });
    // Bridge wraps the upstream body — unwrap before returning.
    const wrappedText = await res.text();
    const wrappedJson = ((() => {
      try {
        return wrappedText ? JSON.parse(wrappedText) : {};
      } catch {
        return { body: wrappedText };
      }
    })()) as {
      success?: boolean;
      status?: number;
      statusText?: string;
      body?: unknown;
      error?: string;
    };
    if (!res.ok || wrappedJson.success === false) {
      // Surface as much detail as possible to the caller.
      const upstreamMsg =
        typeof wrappedJson.body === "string"
          ? wrappedJson.body.slice(0, 300)
          : typeof wrappedJson.body === "object" && wrappedJson.body
            ? ((wrappedJson.body as { message?: string; error?: string }).message ??
                (wrappedJson.body as { error?: string }).error ??
                JSON.stringify(wrappedJson.body).slice(0, 300))
            : undefined;
      const httpInfo = `HTTP ${wrappedJson.status ?? res.status}${
        wrappedJson.statusText ? ` ${wrappedJson.statusText}` : ""
      }`;
      const finalMsg = wrappedJson.error
        ? `Bridge: ${wrappedJson.error}`
        : upstreamMsg
          ? `Provider ${httpInfo}: ${upstreamMsg}`
          : `Bridge ${httpInfo} (no body) — likely IP not whitelisted by provider yet`;
      console.error("[BBPS] bridge error:", JSON.stringify({
        endpoint,
        httpStatus: res.status,
        upstreamStatus: wrappedJson.status,
        upstreamStatusText: wrappedJson.statusText,
        bridgeError: wrappedJson.error,
        wrappedText: wrappedText.slice(0, 500),
        body: typeof wrappedJson.body === "string"
          ? wrappedJson.body.slice(0, 500)
          : wrappedJson.body,
      }));
      throw new Error(finalMsg);
    }
    return (wrappedJson.body ?? {}) as T;
  }

  // Direct call — only works if the worker's IP is whitelisted (it isn't on
  // Cloudflare). Useful for local dev or once-off testing from a fixed host.
  res = await fetch(`${cfg.baseUrl}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Bharat Connect returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = (parsed as { message?: string }).message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return parsed as T;
}

// ──────────────── 1. Get Categories ────────────────

export const bbpsGetCategories = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .handler(async (): Promise<{ success: boolean; categories: BbpsCategory[]; mock?: boolean; message?: string }> => {
    if (isMockMode()) {
      return { success: true, categories: MOCK_CATEGORIES, mock: true };
    }
    try {
      const cfg = await getProviderConfig();
      const json = await callBbps<{ success: boolean; data: BbpsCategory[] }>(
        "/billpay/bill-category",
        { agent: cfg.agentId },
      );
      return { success: true, categories: json.data ?? [] };
    } catch (err) {
      return { success: false, categories: [], message: err instanceof Error ? err.message : "Unknown error" };
    }
  });

// ──────────────── 2. Get Billers ────────────────

const billersInputSchema = z.object({
  category: z.string().min(1).max(100),
});

export const bbpsGetBillers = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: z.infer<typeof billersInputSchema>) => billersInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; billers: BbpsBiller[]; mock?: boolean; message?: string }> => {
    if (isMockMode()) {
      return { success: true, billers: mockBillersFor(data.category), mock: true };
    }
    try {
      const cfg = await getProviderConfig();
      const json = await callBbps<{ success: boolean; biller: BbpsBiller[] }>(
        "/billpay/biller-info",
        { agent: cfg.agentId, category: data.category },
      );
      return { success: true, billers: json.biller ?? [] };
    } catch (err) {
      return { success: false, billers: [], message: err instanceof Error ? err.message : "Unknown error" };
    }
  });

// ──────────────── 3. Get Customer Params ────────────────

const paramsInputSchema = z.object({
  billerId: z.string().min(1).max(50),
});

export const bbpsGetCustomerParams = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: z.infer<typeof paramsInputSchema>) => paramsInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; params: BbpsCustomerParam[]; mode: number | null; mock?: boolean; message?: string }> => {
    if (isMockMode()) {
      // Find category from biller code via mock catalogue.
      const allMockBillers = MOCK_CATEGORIES.flatMap((c) => mockBillersFor(c.name));
      const biller = allMockBillers.find((b) => b.id === data.billerId);
      const cat = biller?.categoryName ?? "Electricity";
      const { params, mode } = mockParamsFor(data.billerId, cat);
      return { success: true, params, mode, mock: true };
    }
    try {
      const cfg = await getProviderConfig();
      const json = await callBbps<{ success: boolean; param: BbpsCustomerParam[]; mode: number }>(
        "/billpay/customer-params",
        { agent: cfg.agentId, billerid: data.billerId },
      );
      return { success: true, params: json.param ?? [], mode: json.mode ?? null };
    } catch (err) {
      return { success: false, params: [], mode: null, message: err instanceof Error ? err.message : "Unknown error" };
    }
  });

// ──────────────── 4. Bill Fetch ────────────────

const fetchInputSchema = z.object({
  billerId: z.string().min(1).max(50),
  paramNames: z.array(z.string().min(1).max(100)).min(1).max(20),
  paramValues: z.array(z.string().min(0).max(200)).min(1).max(20),
});

export const bbpsFetchBill = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: z.infer<typeof fetchInputSchema>) => fetchInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; bill?: BbpsBillFetchResult; mock?: boolean; message?: string }> => {
    if (isMockMode()) {
      const allMockBillers = MOCK_CATEGORIES.flatMap((c) => mockBillersFor(c.name));
      const biller = allMockBillers.find((b) => b.id === data.billerId);
      const cat = biller?.categoryName ?? "Electricity";
      return { success: true, bill: mockBillFor(data.billerId, cat, data.paramValues), mock: true };
    }
    try {
      const cfg = await getProviderConfig();
      // Provider expects stringified JSON-array-ish: {"Consumer Number"} format.
      const paramName = `{${data.paramNames.map((n) => `"${n}"`).join(",")}}`;
      const paramValue = `{${data.paramValues.map((v) => `"${v}"`).join(",")}}`;
      const json = await callBbps<{
        success: boolean;
        insertid: number;
        amount: number;
        custname: string;
        dueDate: string;
        billDate: string;
        billNumber: string;
        message: string;
        requestId: string;
      }>("/billpay/bill-fetch", {
        agent: cfg.agentId,
        billerid: data.billerId,
        paramName,
        paramValue,
      });
      if (!json.success) return { success: false, message: json.message ?? "Bill not found" };
      return {
        success: true,
        bill: {
          insertid: json.insertid,
          amount: Number(json.amount) || 0,
          custname: json.custname ?? "",
          dueDate: json.dueDate ?? "",
          billDate: json.billDate ?? "",
          billNumber: json.billNumber ?? "",
          message: json.message ?? "",
          requestId: json.requestId,
        },
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Unknown error" };
    }
  });

// ──────────────── 5. Bill Validation (no-fetch) ────────────────

const validateInputSchema = z.object({
  billerId: z.string().min(1).max(50),
  paramNames: z.array(z.string().min(1).max(100)).min(1).max(20),
  paramValues: z.array(z.string().min(0).max(200)).min(1).max(20),
  amount: z.number().min(1).max(1_000_000).optional(),
});

export const bbpsValidateBill = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: z.infer<typeof validateInputSchema>) => validateInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; bill?: BbpsBillFetchResult; message?: string }> => {
    try {
      const cfg = await getProviderConfig();
      const paramName = `{${data.paramNames.map((n) => `"${n}"`).join(",")}}`;
      const paramValue = `{${data.paramValues.map((v) => `"${v}"`).join(",")}}`;
      const body: Record<string, unknown> = {
        agent: cfg.agentId,
        billerid: data.billerId,
        paramName,
        paramValue,
      };
      if (data.amount) body.amount = data.amount;
      const json = await callBbps<{
        success: boolean;
        insertid: number;
        amount: string | number;
        custname: string;
        dueDate: string;
        billDate: string;
        billNumber: string;
        message: string;
        requestId: string;
      }>("/billpay/bill-validation", body);
      if (!json.success) return { success: false, message: json.message ?? "Validation failed" };
      return {
        success: true,
        bill: {
          insertid: json.insertid,
          amount: Number(json.amount) || 0,
          custname: json.custname ?? "",
          dueDate: json.dueDate ?? "",
          billDate: json.billDate ?? "",
          billNumber: json.billNumber ?? "",
          message: json.message ?? "",
          requestId: json.requestId,
        },
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Unknown error" };
    }
  });

// ──────────────── 6. Bill Pay (atomic wallet flow) ────────────────

const payInputSchema = z.object({
  billerId: z.string().min(1).max(50),
  billerName: z.string().min(1).max(200),
  categoryName: z.string().min(1).max(100),
  billPaymentId: z.number().int().positive(),
  requestId: z.string().min(1).max(200),
  billerMode: z.number().int().min(1).max(10).optional(),
  mobileNo: z.string().regex(/^\d{10}$/).optional(),
  amount: z.number().min(1).max(1_000_000),
  /** Customer-entered params, preserved on the txn record for the receipt. */
  params: z.record(z.string(), z.string().max(200)),
  /** Optional bill metadata captured at fetch time. */
  customerName: z.string().max(200).optional(),
  billDate: z.string().max(50).optional(),
  dueDate: z.string().max(50).optional(),
  billNumber: z.string().max(100).optional(),
});

export const bbpsPayBill = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: z.infer<typeof payInputSchema>) => payInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{
    success: boolean;
    transactionId?: string;
    receipt?: string | number;
    newBalance?: number;
    fee?: number;
    totalDebited?: number;
    mock?: boolean;
    message?: string;
  }> => {
    if (!context.authUser) return { success: false, message: "Not signed in" };
    const retailerId = context.authUser.uid;
    const retailerEmail = context.authUser.email ?? "";

    const cfg = await getProviderConfig();
    const fee = cfg.feeByCategory[data.categoryName] ?? cfg.defaultFee;
    const totalDebit = data.amount + fee;

    // ── DEMO MODE — skip wallet & provider entirely. ──
    if (isMockMode()) {
      const receipt = mockReceipt();
      const demoDoc = await addDoc(collection(db, "bbps_transactions"), {
        retailerId,
        retailerEmail,
        categoryName: data.categoryName,
        billerCode: data.billerId,
        billerName: data.billerName,
        params: data.params,
        amount: data.amount,
        fee: 0,
        totalDebited: 0,
        status: "success",
        providerBillId: data.billPaymentId,
        providerRequestId: data.requestId,
        providerReceipt: receipt,
        providerMode: data.billerMode ?? null,
        mobileNo: data.mobileNo ?? "",
        customerName: data.customerName ?? "",
        billDate: data.billDate ?? "",
        dueDate: data.dueDate ?? "",
        billNumber: data.billNumber ?? "",
        errorMessage: "DEMO MODE — no wallet debit, no provider call",
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      } satisfies Omit<BbpsTransaction, "id">);
      return {
        success: true,
        transactionId: demoDoc.id,
        receipt,
        newBalance: undefined,
        fee: 0,
        totalDebited: 0,
        mock: true,
        message: "Payment successful (DEMO MODE)",
      };
    }

    // 1. Atomic wallet debit.
    const walletRef = doc(db, "wallets", retailerId);
    let newBalance: number;
    try {
      newBalance = await runTransaction(db, async (tx) => {
        const w = await tx.get(walletRef);
        if (!w.exists()) throw new Error("Wallet not found");
        const current = Number(w.data().balance) || 0;
        if (current < totalDebit) {
          throw new Error(
            `Insufficient balance. Need ₹${totalDebit.toFixed(2)}, have ₹${current.toFixed(2)}`,
          );
        }
        const updated = current - totalDebit;
        tx.update(walletRef, { balance: updated });
        return updated;
      });
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Wallet debit failed" };
    }

    // 2. Create the txn record in `processing` state.
    const txDoc = await addDoc(collection(db, "bbps_transactions"), {
      retailerId,
      retailerEmail,
      categoryName: data.categoryName,
      billerCode: data.billerId,
      billerName: data.billerName,
      params: data.params,
      amount: data.amount,
      fee,
      totalDebited: totalDebit,
      status: "processing",
      providerBillId: data.billPaymentId,
      providerRequestId: data.requestId,
      providerMode: data.billerMode ?? null,
      mobileNo: data.mobileNo ?? "",
      customerName: data.customerName ?? "",
      billDate: data.billDate ?? "",
      dueDate: data.dueDate ?? "",
      billNumber: data.billNumber ?? "",
      createdAt: new Date().toISOString(),
    } satisfies Omit<BbpsTransaction, "id">);

    // Wallet history entry for debit.
    await addDoc(collection(db, "transactions"), {
      userId: retailerId,
      amount: totalDebit,
      type: "debit",
      source: "bbps",
      description: `${data.categoryName} — ${data.billerName}`,
      bbpsTransactionId: txDoc.id,
      createdAt: new Date().toISOString(),
    });

    // 3. Call provider /bill-pay.
    try {
      const json = await callBbps<{ success: boolean; message: string; receipt: string | number }>(
        "/billpay/bill-pay",
        {
          agent: cfg.agentId,
          billerid: data.billerId,
          billcategory: data.categoryName,
          billpaymentid: data.billPaymentId,
          requestId: data.requestId,
          billermode: data.billerMode ?? 1,
          ...(data.mobileNo ? { mobileno: data.mobileNo } : {}),
        },
      );

      if (!json.success) {
        // Refund.
        await refund(walletRef, totalDebit, retailerId, txDoc.id, json.message ?? "Bill payment failed");
        await updateDoc(txDoc, {
          status: "refunded",
          errorMessage: json.message ?? "Bill payment failed",
          refundedAt: new Date().toISOString(),
        });
        return { success: false, message: json.message ?? "Bill payment failed" };
      }

      await updateDoc(txDoc, {
        status: "success",
        providerReceipt: json.receipt,
        paidAt: new Date().toISOString(),
      });
      return {
        success: true,
        transactionId: txDoc.id,
        receipt: json.receipt,
        newBalance,
        fee,
        totalDebited: totalDebit,
        message: json.message,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provider error";
      await refund(walletRef, totalDebit, retailerId, txDoc.id, msg);
      await updateDoc(txDoc, {
        status: "refunded",
        errorMessage: msg,
        refundedAt: new Date().toISOString(),
      });
      return { success: false, message: `${msg} — wallet refunded` };
    }
  });

// ──────────────── Test Connection (admin diagnostic) ────────────────

/**
 * Triggers a real `getAccessToken` call through the VPS bridge and returns the
 * full provider response (status + body + headers used) so the admin can share
 * it verbatim with the provider for debugging.
 *
 * SECURITY: protected by Firebase auth — admin UI is the only caller.
 */
export const bbpsTestConnection = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .handler(async (): Promise<{
    ok: boolean;
    stage: string;
    bridgeReachable?: boolean;
    bridgeUrl?: string;
    providerUrl?: string;
    httpStatus?: number;
    httpStatusText?: string;
    headersSent?: Record<string, string>;
    bodySent?: Record<string, string>;
    response?: string;
    rawText?: string;
    error?: string;
    elapsedMs?: number;
    timestamp: string;
  }> => {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    // Always invalidate any cached token so each diagnostic run is a true
    // round-trip — important after the provider clears a whitelist/cred issue.
    _resetBbpsTokenCache();
    const bridgeBase = process.env.BBPS_BRIDGE_BASE_URL;
    const bridgeSecret = process.env.BBPS_BRIDGE_HMAC_SECRET;
    const clientId = process.env.BBPS_CLIENT_ID;
    const clientSecret = process.env.BBPS_CLIENT_SECRET;
    const apiKey = process.env.BBPS_API_KEY;

    // Mask secrets when echoing back to UI
    const mask = (s: string | undefined) =>
      !s ? "(missing)" : s.length <= 12 ? "***" : `${s.slice(0, 6)}…${s.slice(-4)} (${s.length} chars)`;

    if (!clientId || !clientSecret || !apiKey) {
      return {
        ok: false,
        stage: "config",
        error: `Missing secrets — clientId: ${mask(clientId)}, clientSecret: ${mask(clientSecret)}, apiKey: ${mask(apiKey)}`,
        timestamp,
      };
    }
    if (!bridgeBase || !bridgeSecret) {
      return {
        ok: false,
        stage: "config",
        error: "BBPS_BRIDGE_BASE_URL or BBPS_BRIDGE_HMAC_SECRET not configured",
        timestamp,
      };
    }

    const cfg = await getProviderConfig();
    const headersSent = {
      "Content-Type": "application/json",
      apiKey: mask(apiKey),
    };
    const bodySent = { clientId: mask(clientId), clientSecret: mask(clientSecret) };

    // Stage 1: bridge /health
    let bridgeReachable = false;
    try {
      const h = await fetch(`${bridgeBase.replace(/\/+$/, "")}/health`, {
        signal: AbortSignal.timeout(10_000),
      });
      bridgeReachable = h.ok;
    } catch (e) {
      return {
        ok: false,
        stage: "bridge_health",
        bridgeReachable: false,
        bridgeUrl: bridgeBase,
        error: `Bridge unreachable: ${e instanceof Error ? e.message : String(e)}`,
        elapsedMs: Date.now() - startedAt,
        timestamp,
      };
    }

    // Stage 2: real provider call via bridge
    try {
      const wrapped = JSON.stringify({
        __headers: { "Content-Type": "application/json", apiKey },
        __payload: { clientId, clientSecret },
      });
      const ts = Date.now();
      const signature = await hmacHex(bridgeSecret, wrapped);
      const url = `${bridgeBase.replace(/\/+$/, "")}/provider/getAccessToken`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": signature,
          "X-Timestamp": String(ts),
        },
        body: wrapped,
        signal: AbortSignal.timeout(30_000),
      });
      const wrappedText = await res.text();
      const wrappedJson = ((() => {
        try {
          return wrappedText ? JSON.parse(wrappedText) : {};
        } catch {
          return { body: wrappedText };
        }
      })()) as {
        success?: boolean;
        status?: number;
        statusText?: string;
        body?: unknown;
        error?: string;
      };
      const rawText =
        typeof wrappedJson.body === "string"
          ? wrappedJson.body
          : JSON.stringify(wrappedJson.body ?? null);
      return {
        ok: !!wrappedJson.success,
        stage: "provider_call",
        bridgeReachable: true,
        bridgeUrl: bridgeBase,
        providerUrl: `${cfg.baseUrl}/getAccessToken`,
        httpStatus: wrappedJson.status,
        httpStatusText: wrappedJson.statusText,
        headersSent,
        bodySent,
        response: typeof wrappedJson.body === "string" ? wrappedJson.body : JSON.stringify(wrappedJson.body ?? null, null, 2),
        rawText: wrappedText || rawText,
        error: wrappedJson.error ?? (!wrappedJson.success && !wrappedJson.body ? wrappedText || "Provider returned an empty response" : undefined),
        elapsedMs: Date.now() - startedAt,
        timestamp,
      };
    } catch (e) {
      return {
        ok: false,
        stage: "provider_call",
        bridgeReachable: true,
        bridgeUrl: bridgeBase,
        providerUrl: `${cfg.baseUrl}/getAccessToken`,
        headersSent,
        bodySent,
        error: e instanceof Error ? e.message : String(e),
        elapsedMs: Date.now() - startedAt,
        timestamp,
      };
    }
  });

async function refund(
  walletRef: ReturnType<typeof doc>,
  amount: number,
  retailerId: string,
  bbpsTransactionId: string,
  reason: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const w = await tx.get(walletRef);
    if (!w.exists()) return;
    const current = Number(w.data().balance) || 0;
    tx.update(walletRef, { balance: current + amount });
  });
  await addDoc(collection(db, "transactions"), {
    userId: retailerId,
    amount,
    type: "credit",
    source: "refund",
    description: `Refund: ${reason}`,
    bbpsTransactionId,
    createdAt: new Date().toISOString(),
  });
}
