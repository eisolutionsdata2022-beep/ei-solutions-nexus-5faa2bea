/**
 * Public webhook endpoint for NSDL eKYC PAN callbacks.
 *
 * Upstream NSDL provider posts here when an eKYC PAN application completes.
 * We update the corresponding pan_orders document and either confirm the
 * debit (success) or refund the retailer (failure).
 *
 * Security: validates HMAC-SHA256 signature when `webhookSecret` is set in
 * pan_config/master. Without a configured secret the endpoint accepts any
 * payload (matches the legacy PHP behaviour while still allowing rotation).
 */
import { createFileRoute } from "@tanstack/react-router";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || "ei-fix";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    if (clientEmail && privateKey) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } else {
      // Fallback for environments where admin creds aren't configured yet —
      // app init will throw on first DB call which we catch below.
      initializeApp({ projectId });
    }
  }
  return getFirestore();
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

interface NsdlPayload {
  StatusCode?: string;
  Message?: string;
  AgentID?: string;
  TxnId?: string;
  Type?: string;
  Transactions?: {
    AckNo?: string;
    OrderID?: string;
    Status?: string;
    Number?: string;
  };
}

export const Route = createFileRoute("/api/public/pan-portal/nsdl-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        let payload: NsdlPayload;
        try { payload = JSON.parse(body) as NsdlPayload; }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        let firestoreDb;
        try { firestoreDb = getAdminDb(); }
        catch (err) {
          console.error("[PAN webhook] firebase admin init failed:", err);
          return new Response("Internal config error", { status: 500 });
        }

        // Verify HMAC if admin configured a secret.
        try {
          const cfgSnap = await firestoreDb.collection("pan_config").doc("master").get();
          const webhookSecret = (cfgSnap.exists ? cfgSnap.data()?.webhookSecret : "") as string | undefined;
          if (webhookSecret && webhookSecret.length >= 8) {
            const sig = request.headers.get("x-webhook-signature") || "";
            const expected = await hmacSha256(webhookSecret, body);
            if (!sig || !timingSafeEqual(sig, expected)) {
              console.warn("[PAN webhook] signature mismatch");
              return new Response("Invalid signature", { status: 401 });
            }
          }
        } catch (err) {
          console.error("[PAN webhook] config read failed:", err);
        }

        const orderId = payload.TxnId || payload.Transactions?.OrderID || "";
        if (!orderId) return new Response("Missing TxnId", { status: 400 });

        const orderRef = firestoreDb.collection("pan_orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          console.warn(`[PAN webhook] unknown order ${orderId}`);
          return new Response("ok", { status: 200 }); // 200 to avoid retry storm
        }
        const order = orderSnap.data() as Record<string, unknown>;
        if (order.status !== "pending") {
          return new Response("already processed", { status: 200 });
        }

        const ackNo = payload.Transactions?.AckNo || "";
        const message = payload.Message || "";

        if (payload.StatusCode === "1") {
          await orderRef.update({
            status: "success",
            ackNo,
            remark: message,
            encryptedData: body.slice(0, 8000),
            updatedAt: new Date().toISOString(),
          });
          console.log(`[PAN webhook] success ${orderId} ack=${ackNo}`);
          return new Response("ok", { status: 200 });
        }

        // Failure → refund retailer.
        const retailerId = String(order.retailerId || "");
        const amount = Number(order.amount || 0);
        if (retailerId && amount > 0) {
          try {
            const walletRef = firestoreDb.collection("wallets").doc(retailerId);
            await firestoreDb.runTransaction(async (tx) => {
              const w = await tx.get(walletRef);
              if (!w.exists) return;
              const current = (w.data()?.balance as number) || 0;
              tx.update(walletRef, { balance: current + amount });
            });
            await firestoreDb.collection("transactions").add({
              userId: retailerId,
              amount,
              type: "credit",
              source: "pan-portal",
              description: `NSDL eKYC PAN refund — ${orderId}`,
              orderId,
              createdAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error("[PAN webhook] refund failed:", err);
          }
        }

        await orderRef.update({
          status: "refunded",
          remark: message || "Application failed at NSDL",
          encryptedData: body.slice(0, 8000),
          updatedAt: new Date().toISOString(),
          refundedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[PAN webhook] refunded ${orderId}`);
        return new Response("ok", { status: 200 });
      },
      GET: async () => new Response("pan-portal webhook ready", { status: 200 }),
    },
  },
});
