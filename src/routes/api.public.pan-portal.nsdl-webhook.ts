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
 *
 * Uses Firebase Web SDK on the server (matches src/routes/api.email.* pattern).
 */
import { createFileRoute } from "@tanstack/react-router";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  runTransaction,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCCMmXPtFxcylhjRNvlR5PFgLYwgzb12U",
  authDomain: "ei-fix.firebaseapp.com",
  projectId: "ei-fix",
  storageBucket: "ei-fix.firebasestorage.app",
  messagingSenderId: "80350889731",
  appId: "1:80350889731:web:4a7a9af9ec8a10e1c4cb36",
};

function getDb() {
  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return getFirestore(app);
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
      GET: async () => new Response("pan-portal webhook ready", { status: 200 }),

      POST: async ({ request }) => {
        const body = await request.text();
        let payload: NsdlPayload;
        try { payload = JSON.parse(body) as NsdlPayload; }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const db = getDb();

        // Verify HMAC signature if admin configured one.
        try {
          // webhookSecret now lives in pan_config/secrets (admin-only).
          // Fall back to legacy location pan_config/master for older installs.
          const secretsSnap = await getDoc(doc(db, "pan_config", "secrets")).catch(() => null);
          let webhookSecret = secretsSnap && secretsSnap.exists()
            ? ((secretsSnap.data() as Record<string, unknown>).webhookSecret as string | undefined)
            : undefined;
          if (!webhookSecret) {
            const cfgSnap = await getDoc(doc(db, "pan_config", "master")).catch(() => null);
            webhookSecret = cfgSnap && cfgSnap.exists()
              ? ((cfgSnap.data() as Record<string, unknown>).webhookSecret as string | undefined)
              : undefined;
          }
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

        const orderRef = doc(db, "pan_orders", orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) {
          console.warn(`[PAN webhook] unknown order ${orderId}`);
          return new Response("ok", { status: 200 });
        }
        const order = orderSnap.data() as Record<string, unknown>;
        if (order.status !== "pending") {
          return new Response("already processed", { status: 200 });
        }

        const ackNo = payload.Transactions?.AckNo || "";
        const message = payload.Message || "";
        const nowIso = new Date().toISOString();

        if (payload.StatusCode === "1") {
          await updateDoc(orderRef, {
            status: "success",
            ackNo,
            remark: message,
            encryptedData: body.slice(0, 8000),
            updatedAt: nowIso,
          });
          console.log(`[PAN webhook] success ${orderId} ack=${ackNo}`);
          return new Response("ok", { status: 200 });
        }

        // Failure → refund retailer.
        const retailerId = String(order.retailerId || "");
        const amount = Number(order.amount || 0);
        if (retailerId && amount > 0) {
          try {
            const walletRef = doc(db, "wallets", retailerId);
            await runTransaction(db, async (tx) => {
              const w = await tx.get(walletRef);
              if (!w.exists()) return;
              const current = (w.data().balance as number) || 0;
              tx.update(walletRef, { balance: current + amount });
            });
            await addDoc(collection(db, "transactions"), {
              userId: retailerId,
              amount,
              type: "credit",
              source: "pan-portal",
              description: `NSDL eKYC PAN refund — ${orderId}`,
              orderId,
              createdAt: nowIso,
            });
          } catch (err) {
            console.error("[PAN webhook] refund failed:", err);
          }
        }

        await updateDoc(orderRef, {
          status: "refunded",
          remark: message || "Application failed at NSDL",
          encryptedData: body.slice(0, 8000),
          updatedAt: nowIso,
          refundedAt: nowIso,
        });
        console.log(`[PAN webhook] refunded ${orderId}`);
        return new Response("ok", { status: 200 });
      },
    },
  },
});
