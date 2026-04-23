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
import { buildApiKeyHeader, encrypt } from "./bbps-encryption.server";
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
  expiresAt: number; // epoch ms
}
let tokenCache: TokenCache | null = null;

async function getProviderConfig(): Promise<{
  baseUrl: string;
  agentId: string;
  defaultFee: number;
  feeByCategory: Record<string, number>;
}> {
  const snap = await getDoc(doc(db, "bbps_config/master"));
  if (!snap.exists()) return {
    baseUrl: process.env.BBPS_BASE_URL ?? DEFAULT_BBPS_CONFIG.baseUrl,
    agentId: DEFAULT_BBPS_CONFIG.agentId,
    defaultFee: DEFAULT_BBPS_CONFIG.defaultFee,
    feeByCategory: {},
  };
  const data = snap.data() as Partial<typeof DEFAULT_BBPS_CONFIG>;
  return {
    baseUrl: data.baseUrl ?? process.env.BBPS_BASE_URL ?? DEFAULT_BBPS_CONFIG.baseUrl,
    agentId: data.agentId ?? DEFAULT_BBPS_CONFIG.agentId,
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

async function getAccessToken(_baseUrl: string): Promise<string> {
  // Use cached token if still valid for ≥60s.
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }
  const clientId = process.env.BBPS_CLIENT_ID;
  const clientSecret = process.env.BBPS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Bharat Connect not configured — BBPS_CLIENT_ID / BBPS_CLIENT_SECRET missing. Add them in Lovable Cloud Settings.",
    );
  }

  // Route through the bridge too — provider IP-checks the auth endpoint.
  const json = await callBbps<{
    success?: boolean;
    accessToken?: string;
    message?: string;
  }>(
    "/getAccessToken",
    {
      clientId: encrypt(clientId),
      clientSecret: encrypt(clientSecret),
    },
    { skipAuth: true },
  );

  if (!json.success || !json.accessToken) {
    throw new Error(json.message ?? "Auth failed");
  }

  const expiresAt = jwtExpiryMs(json.accessToken) ?? Date.now() + 30 * 60_000;
  tokenCache = { accessToken: json.accessToken, expiresAt };
  return json.accessToken;
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apiKey: buildApiKeyHeader(process.env.BBPS_CLIENT_ID ?? ""),
  };
  if (!opts.skipAuth) {
    const token = await getAccessToken(cfg.baseUrl);
    headers.Authorization = `Bearer ${token}`;
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
    const wrappedJson = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      status?: number;
      body?: unknown;
      error?: string;
    };
    if (!res.ok || wrappedJson.success === false) {
      throw new Error(
        wrappedJson.error ??
          (typeof wrappedJson.body === "object"
            ? (wrappedJson.body as { message?: string })?.message
            : undefined) ??
          `Bridge HTTP ${wrappedJson.status ?? res.status}`,
      );
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
