/**
 * Paytm v2 — TanStack Start server functions.
 *
 * Three operations:
 *   1. initiatePaytmCheckout — generates redirect form params + checksum
 *   2. createPaytmQr         — calls Paytm /qr/create, stores QR data
 *   3. checkPaytmStatus      — polls Paytm /v3/order/status, credits wallet on success
 *
 * Uses the Firebase JS SDK (client) on the server — same pattern as bbps-api.functions.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  runTransaction,
  updateDoc,
  Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firebaseAuthMiddleware } from "@/lib/firebase-auth.middleware";
// Server-only checksum helpers — lazy-loaded inside handlers so the
// `.server.ts` module never appears as a top-level import in client bundles.
async function loadChecksum() {
  return import("@/lib/paytm-checksum.server");
}
import { DEFAULT_PAYTM_CONFIG, type PaytmMasterConfig, type PaytmTopupRequest } from "@/lib/paytm-types";

interface PaytmCreds {
  mid: string;
  key: string;
  envBase: string;
  pgChargesPercent: number;
  minAmount: number;
}

async function fetchPaytmJson<T>(url: string, init: RequestInit, label: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Paytm ${label} failed (${res.status}): ${text.slice(0, 160)}`);
    }
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Paytm ${label} timed out. Please try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPaytmCreds(): Promise<{ creds: PaytmCreds; cfg: PaytmMasterConfig }> {
  const mid = process.env.PAYTM_MERCHANT_MID ?? "";
  const key = process.env.PAYTM_MERCHANT_KEY ?? "";
  if (!mid || !key) {
    throw new Error("Paytm credentials not configured. Add PAYTM_MERCHANT_MID and PAYTM_MERCHANT_KEY in Lovable secrets.");
  }
  let cfg: PaytmMasterConfig = DEFAULT_PAYTM_CONFIG;
  try {
    const snap = await getDoc(doc(db, "paytm_config/master"));
    cfg = snap.exists()
      ? { ...DEFAULT_PAYTM_CONFIG, ...(snap.data() as Partial<PaytmMasterConfig>) }
      : DEFAULT_PAYTM_CONFIG;
  } catch (err) {
    console.warn("[Paytm] paytm_config/master read failed; using defaults:", err instanceof Error ? err.message : err);
  }
  if (!cfg.enabled) throw new Error("Paytm payments are currently disabled by admin.");
  const envBase =
    cfg.environment === "PROD"
      ? "https://securegw.paytm.in"
      : "https://securegw-stage.paytm.in";
  return {
    creds: { mid, key, envBase, pgChargesPercent: cfg.pgChargesPercent, minAmount: cfg.minAmount },
    cfg,
  };
}

function makeOrderId(prefix: "EICO" | "EIQR", uid: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const short = uid.slice(0, 6).toUpperCase();
  return `${prefix}${ts}${short}`;
}

function calcCharges(amount: number, pct: number): { charges: number; credit: number } {
  const charges = Math.round(amount * (pct / 100) * 100) / 100;
  const credit = Math.round((amount - charges) * 100) / 100;
  return { charges, credit };
}

/* ─────────────────────────────────────────────────────────── */
/* 1. CHECKOUT (redirect) — returns form params for client POST */
/* ─────────────────────────────────────────────────────────── */
export const initiatePaytmCheckout = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: { amount: number; mobile?: string; email?: string }) => {
    if (!input || typeof input.amount !== "number" || input.amount <= 0) {
      throw new Error("Invalid amount");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const authUser = (context as { authUser?: { uid: string; email?: string } | null }).authUser ?? null;
    if (!authUser?.uid) throw new Error("Not authenticated");

    const { creds } = await loadPaytmCreds();
    if (data.amount < creds.minAmount) {
      throw new Error(`Minimum top-up amount is ₹${creds.minAmount}`);
    }

    const orderId = makeOrderId("EICO", authUser.uid);
    const { charges, credit } = calcCharges(data.amount, creds.pgChargesPercent);
    const host = getRequestHost();
    const callbackUrl = `https://${host}/api/public/paytm-callback`;

    // Param set copied verbatim from legacy paytm_v2/index.php
    const params: Record<string, string> = {
      MID: creds.mid,
      ORDER_ID: orderId,
      CUST_ID: authUser.uid,
      INDUSTRY_TYPE_ID: "Retail",
      CHANNEL_ID: "WEB",
      TXN_AMOUNT: data.amount.toFixed(2),
      WEBSITE: "DEFAULT",
      PAYMENT_MODE_ONLY: "YES",
      PAYMENT_TYPE_ID: "UPI",
      CALLBACK_URL: callbackUrl,
      MSISDN: data.mobile ?? "",
      EMAIL: data.email ?? authUser.email ?? "",
      VERIFIED_BY: "EMAIL",
      IS_USER_VERIFIED: "YES",
    };

    const { generatePaytmSignature } = await loadChecksum();
    const checksum = generatePaytmSignature(params, creds.key);

    await addDoc(collection(db, "wallet_topup_requests"), {
      orderId,
      retailerId: authUser.uid,
      retailerEmail: authUser.email ?? "",
      retailerMobile: data.mobile ?? "",
      amount: data.amount,
      pgChargesAmount: charges,
      creditAmount: credit,
      flow: "checkout",
      status: "pending",
      createdAt: new Date().toISOString(),
    } satisfies Omit<PaytmTopupRequest, "id">);

    return {
      orderId,
      txnUrl: `${creds.envBase}/order/process`,
      params: { ...params, CHECKSUMHASH: checksum },
    };
  });

/* ─────────────────────────────────────────────── */
/* 2. DYNAMIC QR — calls Paytm /paymentservices/qr/create */
/* ─────────────────────────────────────────────── */
export const createPaytmQr = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: { amount: number; mobile?: string }) => {
    if (!input || typeof input.amount !== "number" || input.amount <= 0) {
      throw new Error("Invalid amount");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const authUser = (context as { authUser?: { uid: string; email?: string } | null }).authUser ?? null;
    if (!authUser?.uid) throw new Error("Not authenticated");

    const { creds, cfg } = await loadPaytmCreds();
    if (data.amount < creds.minAmount) {
      throw new Error(`Minimum top-up amount is ₹${creds.minAmount}`);
    }

    const orderId = makeOrderId("EIQR", authUser.uid);
    const { charges, credit } = calcCharges(data.amount, creds.pgChargesPercent);

    // QR body copied verbatim from legacy paytm_v2/QRCode.php
    const body = {
      mid: creds.mid,
      orderId,
      amount: data.amount.toFixed(2),
      contactPhoneNo: data.mobile ?? "",
      displayName: "EI SOLUTIONS",
      businessType: "UPI_QR_CODE",
      posId: "S12_123",
    };
    const { generatePaytmSignature } = await loadChecksum();
    const signature = generatePaytmSignature(JSON.stringify(body), creds.key);
    const post = {
      head: { clientId: "C11", version: "v1", signature },
      body,
    };

    const json = await fetchPaytmJson<{
      body?: { qrData?: string; resultInfo?: { resultStatus?: string; resultMsg?: string } };
    }>(`${creds.envBase}/paymentservices/qr/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    }, "QR create");

    const status = json.body?.resultInfo?.resultStatus;
    const qrData = json.body?.qrData;
    if (status !== "SUCCESS" || !qrData) {
      throw new Error(json.body?.resultInfo?.resultMsg ?? "Failed to generate QR");
    }

    const expiresAt = new Date(Date.now() + cfg.qrExpiryMinutes * 60_000).toISOString();
    await addDoc(collection(db, "wallet_topup_requests"), {
      orderId,
      retailerId: authUser.uid,
      retailerEmail: authUser.email ?? "",
      retailerMobile: data.mobile ?? "",
      amount: data.amount,
      pgChargesAmount: charges,
      creditAmount: credit,
      flow: "qr",
      status: "pending",
      qrData,
      createdAt: new Date().toISOString(),
      expiresAt,
    } satisfies Omit<PaytmTopupRequest, "id">);

    return { orderId, qrData, amount: data.amount, creditAmount: credit, expiresAt };
  });

/* ────────────────────────────────────────────────────────── */
/* 3. STATUS CHECK — verifies + credits wallet on success     */
/* ────────────────────────────────────────────────────────── */
export const checkPaytmStatus = createServerFn({ method: "POST" })
  .middleware([firebaseAuthMiddleware])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error("orderId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const authUser = (context as { authUser?: { uid: string } | null }).authUser ?? null;
    if (!authUser?.uid) throw new Error("Not authenticated");
    return runPaytmStatusCheck(data.orderId, authUser.uid);
  });

/**
 * Shared status-check + wallet-credit logic.
 * Called by user-triggered server function above and the public callback route.
 */
export async function runPaytmStatusCheck(
  orderId: string,
  expectedUid: string | null,
): Promise<{ status: string; creditAmount?: number; message?: string }> {
  const { creds } = await loadPaytmCreds();

  const snap = await getDocs(
    query(collection(db, "wallet_topup_requests"), where("orderId", "==", orderId), limit(1)),
  );
  if (snap.empty) return { status: "not_found", message: "Order not found" };

  const reqDoc = snap.docs[0];
  const req = reqDoc.data() as PaytmTopupRequest;

  if (expectedUid && req.retailerId !== expectedUid) {
    return { status: "forbidden", message: "Not your order" };
  }
  if (req.status === "success") {
    return { status: "success", creditAmount: req.creditAmount, message: "Already credited" };
  }

  // Status query — copied verbatim from legacy:
  //   QR flow      → cron_check_status.php → /v3/order/status (JSON)  for BOTH prod & stage
  //   Checkout PROD → config_paytm.php     → /merchant-status/getTxnStatus (form + CHECKSUMHASH)
  //   Checkout STAGE→ config_paytm.php     → /order/status (JSON v3)
  const isProd = creds.envBase.startsWith("https://securegw.paytm.in");
  const useFormApi = isProd && req.flow === "checkout";
  let r: {
    resultInfo?: { resultStatus?: string; resultMsg?: string };
    txnId?: string;
    bankTxnId?: string;
    txnAmount?: string | number;
    paymentMode?: string;
    gatewayName?: string;
  } = {};

  const { generatePaytmSignature } = await loadChecksum();
  if (useFormApi) {
    const statusParams: Record<string, string> = { MID: creds.mid, ORDERID: orderId };
    const checksum = generatePaytmSignature(statusParams, creds.key);
    const form = new URLSearchParams({ ...statusParams, CHECKSUMHASH: checksum });
    const json = await fetchPaytmJson<Record<string, unknown>>(`${creds.envBase}/merchant-status/getTxnStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    }, "status check");
    r = {
      resultInfo: {
        resultStatus: json.STATUS as string,
        resultMsg: json.RESPMSG as string,
      },
      txnId: json.TXNID as string,
      bankTxnId: json.BANKTXNID as string,
      txnAmount: json.TXNAMOUNT as string,
      paymentMode: json.PAYMENTMODE as string,
      gatewayName: json.GATEWAYNAME as string,
    };
  } else {
    const body = { mid: creds.mid, orderId };
    const signature = generatePaytmSignature(JSON.stringify(body), creds.key);
    const post = { head: { signature }, body };
    const json = await fetchPaytmJson<{ body?: typeof r }>(`${creds.envBase}/v3/order/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    }, "status check");
    r = json.body ?? {};
  }

  const status = r.resultInfo?.resultStatus;
  const txnAmount = Number(r.txnAmount ?? 0);

  if (status === "TXN_SUCCESS" && txnAmount === req.amount && req.status === "pending") {
    // Legacy cron_check_status.php lines 68-76:
    //   - Default: deduct PG% from amount
    //   - UPI    : NO deduction — full amount credited
    const isUpi = (r.paymentMode ?? "").toUpperCase() === "UPI";
    const finalCredit = isUpi ? req.amount : req.creditAmount;
    const finalCharges = isUpi ? 0 : req.pgChargesAmount;

    const walletRef = doc(db, "wallets", req.retailerId);
    await runTransaction(db, async (tx: Transaction) => {
      const w = await tx.get(walletRef);
      const current = (w.exists() ? (w.data()?.balance as number) : 0) || 0;
      const updated = current + finalCredit;
      if (w.exists()) tx.update(walletRef, { balance: updated });
      else tx.set(walletRef, { balance: updated, userId: req.retailerId });

      tx.update(reqDoc.ref, {
        status: "success",
        creditAmount: finalCredit,
        pgChargesAmount: finalCharges,
        paytmTxnId: r.txnId ?? "",
        bankTxnId: r.bankTxnId ?? "",
        paymentMode: r.paymentMode ?? "",
        gatewayName: r.gatewayName ?? "",
        message: r.resultInfo?.resultMsg ?? "",
        paidAt: new Date().toISOString(),
      });
    });

    await addDoc(collection(db, "transactions"), {
      userId: req.retailerId,
      amount: finalCredit,
      type: "credit",
      source: "Paytm Gateway",
      description: `Add Money via Paytm (${r.paymentMode ?? "—"}) — ${orderId}`,
      orderId,
      paytmTxnId: r.txnId ?? "",
      bankTxnId: r.bankTxnId ?? "",
      pgChargesAmount: finalCharges,
      grossAmount: req.amount,
      createdAt: new Date().toISOString(),
    });

    return { status: "success", creditAmount: finalCredit, message: r.resultInfo?.resultMsg };
  }

  if (status === "TXN_FAILURE" || status === "PENDING_FAILURE") {
    await updateDoc(reqDoc.ref, {
      status: "failed",
      message: r.resultInfo?.resultMsg ?? "Transaction failed",
    });
    return { status: "failed", message: r.resultInfo?.resultMsg };
  }

  return { status: "pending", message: r.resultInfo?.resultMsg ?? "Awaiting payment" };
}
