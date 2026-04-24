/**
 * Paytm v2 — TanStack Start server functions.
 *
 * Three operations:
 *   1. initiatePaytmCheckout — generates redirect form params + checksum
 *   2. createPaytmQr         — calls Paytm /qr/create, stores QR data
 *   3. checkPaytmStatus      — polls Paytm /v3/order/status, credits wallet on success
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { adminDb } from "@/lib/firebase-auth.server";
import { firebaseAuthMiddleware } from "@/lib/firebase-auth.middleware";
import { generatePaytmSignature } from "@/lib/paytm-checksum.server";
import { DEFAULT_PAYTM_CONFIG, type PaytmMasterConfig, type PaytmTopupRequest } from "@/lib/paytm-types";

interface PaytmCreds {
  mid: string;
  key: string;
  envBase: string;
  pgChargesPercent: number;
  minAmount: number;
}

async function loadPaytmCreds(): Promise<{ creds: PaytmCreds; cfg: PaytmMasterConfig }> {
  const mid = process.env.PAYTM_MERCHANT_MID ?? "";
  const key = process.env.PAYTM_MERCHANT_KEY ?? "";
  if (!mid || !key) {
    throw new Error("Paytm credentials not configured. Add PAYTM_MERCHANT_MID and PAYTM_MERCHANT_KEY in Lovable secrets.");
  }
  const snap = await adminDb().doc("paytm_config/master").get();
  const cfg: PaytmMasterConfig = snap.exists
    ? { ...DEFAULT_PAYTM_CONFIG, ...(snap.data() as Partial<PaytmMasterConfig>) }
    : DEFAULT_PAYTM_CONFIG;
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
    const authUser = (context as any).authUser as { uid: string; email?: string } | null;
    if (!authUser?.uid) throw new Error("Not authenticated");

    const { creds } = await loadPaytmCreds();
    if (data.amount < creds.minAmount) {
      throw new Error(`Minimum top-up amount is ₹${creds.minAmount}`);
    }

    const orderId = makeOrderId("EICO", authUser.uid);
    const { charges, credit } = calcCharges(data.amount, creds.pgChargesPercent);
    const host = getRequestHost();
    const callbackUrl = `https://${host}/api/public/paytm-callback`;

    const params: Record<string, string> = {
      MID: creds.mid,
      ORDER_ID: orderId,
      CUST_ID: authUser.uid,
      INDUSTRY_TYPE_ID: "Retail",
      CHANNEL_ID: "WEB",
      TXN_AMOUNT: data.amount.toFixed(2),
      WEBSITE: creds.envBase.includes("stage") ? "WEBSTAGING" : "DEFAULT",
      CALLBACK_URL: callbackUrl,
      MSISDN: data.mobile ?? "",
      EMAIL: data.email ?? authUser.email ?? "",
    };

    const checksum = generatePaytmSignature(params, creds.key);

    // Persist topup request as pending
    await adminDb().collection("wallet_topup_requests").add({
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
    const authUser = (context as any).authUser as { uid: string; email?: string } | null;
    if (!authUser?.uid) throw new Error("Not authenticated");

    const { creds, cfg } = await loadPaytmCreds();
    if (data.amount < creds.minAmount) {
      throw new Error(`Minimum top-up amount is ₹${creds.minAmount}`);
    }

    const orderId = makeOrderId("EIQR", authUser.uid);
    const { charges, credit } = calcCharges(data.amount, creds.pgChargesPercent);

    const body = {
      mid: creds.mid,
      orderId,
      amount: data.amount.toFixed(2),
      contactPhoneNo: data.mobile ?? "",
      displayName: "EI SOLUTIONS",
      businessType: "UPI_QR_CODE",
      posId: "EI_WEB_01",
    };
    const signature = generatePaytmSignature(JSON.stringify(body), creds.key);
    const post = {
      head: { clientId: "C11", version: "v1", signature },
      body,
    };

    const url = `${creds.envBase}/paymentservices/qr/create`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
    const json = (await res.json()) as {
      body?: { qrData?: string; resultInfo?: { resultStatus?: string; resultMsg?: string } };
    };

    const status = json.body?.resultInfo?.resultStatus;
    const qrData = json.body?.qrData;
    if (status !== "SUCCESS" || !qrData) {
      throw new Error(json.body?.resultInfo?.resultMsg ?? "Failed to generate QR");
    }

    const expiresAt = new Date(Date.now() + cfg.qrExpiryMinutes * 60_000).toISOString();
    await adminDb().collection("wallet_topup_requests").add({
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
    const authUser = (context as any).authUser as { uid: string } | null;
    if (!authUser?.uid) throw new Error("Not authenticated");

    const result = await runPaytmStatusCheck(data.orderId, authUser.uid);
    return result;
  });

/**
 * Shared status-check + wallet-credit logic.
 * Used by both the user-triggered server function above and the public callback route.
 */
export async function runPaytmStatusCheck(
  orderId: string,
  expectedUid: string | null,
): Promise<{ status: string; creditAmount?: number; message?: string }> {
  const { creds } = await loadPaytmCreds();
  const adb = adminDb();

  // Find the pending request
  const snap = await adb
    .collection("wallet_topup_requests")
    .where("orderId", "==", orderId)
    .limit(1)
    .get();
  if (snap.empty) return { status: "not_found", message: "Order not found" };

  const reqDoc = snap.docs[0];
  const req = reqDoc.data() as PaytmTopupRequest;

  // Optional UID check (skipped for callback route)
  if (expectedUid && req.retailerId !== expectedUid) {
    return { status: "forbidden", message: "Not your order" };
  }
  if (req.status === "success") {
    return { status: "success", creditAmount: req.creditAmount, message: "Already credited" };
  }

  // Query Paytm
  const body = { mid: creds.mid, orderId };
  const signature = generatePaytmSignature(JSON.stringify(body), creds.key);
  const post = { head: { signature }, body };

  const res = await fetch(`${creds.envBase}/v3/order/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
  const json = (await res.json()) as {
    body?: {
      resultInfo?: { resultStatus?: string; resultMsg?: string };
      txnId?: string;
      bankTxnId?: string;
      txnAmount?: string | number;
      paymentMode?: string;
      gatewayName?: string;
    };
  };
  const r = json.body ?? {};
  const status = r.resultInfo?.resultStatus;
  const txnAmount = Number(r.txnAmount ?? 0);

  if (status === "TXN_SUCCESS" && txnAmount === req.amount && req.status === "pending") {
    // Atomic: credit wallet + update request
    const walletRef = adb.doc(`wallets/${req.retailerId}`);
    await adb.runTransaction(async (tx) => {
      const w = await tx.get(walletRef);
      const current = (w.exists ? (w.data()?.balance as number) : 0) || 0;
      const updated = current + req.creditAmount;
      if (w.exists) tx.update(walletRef, { balance: updated });
      else tx.set(walletRef, { balance: updated, userId: req.retailerId });

      tx.update(reqDoc.ref, {
        status: "success",
        paytmTxnId: r.txnId ?? "",
        bankTxnId: r.bankTxnId ?? "",
        paymentMode: r.paymentMode ?? "",
        gatewayName: r.gatewayName ?? "",
        message: r.resultInfo?.resultMsg ?? "",
        paidAt: new Date().toISOString(),
      });
    });

    // Record transaction (outside tx — log only)
    await adb.collection("transactions").add({
      userId: req.retailerId,
      amount: req.creditAmount,
      type: "credit",
      source: "Paytm Gateway",
      description: `Add Money via Paytm (${r.paymentMode ?? "—"}) — ${orderId}`,
      orderId,
      paytmTxnId: r.txnId ?? "",
      bankTxnId: r.bankTxnId ?? "",
      pgChargesAmount: req.pgChargesAmount,
      grossAmount: req.amount,
      createdAt: new Date().toISOString(),
    });

    return { status: "success", creditAmount: req.creditAmount, message: r.resultInfo?.resultMsg };
  }

  if (status === "TXN_FAILURE" || status === "PENDING_FAILURE") {
    await reqDoc.ref.update({
      status: "failed",
      message: r.resultInfo?.resultMsg ?? "Transaction failed",
    });
    return { status: "failed", message: r.resultInfo?.resultMsg };
  }

  return { status: "pending", message: r.resultInfo?.resultMsg ?? "Awaiting payment" };
}
