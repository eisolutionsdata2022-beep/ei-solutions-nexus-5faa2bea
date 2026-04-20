import { createFileRoute } from "@tanstack/react-router";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

const SUCCESS_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#f9fafb;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{background:white;padding:40px 48px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);text-align:center;max-width:420px}
h1{color:#059669;margin:0 0 12px;font-size:24px}p{color:#4b5563;margin:0 0 8px}small{color:#9ca3af}</style></head>
<body><div class="card"><div style="font-size:48px;margin-bottom:12px">✅</div>
<h1>Unsubscribed</h1><p>You will no longer receive marketing emails from EI Solutions.</p>
<p><small>If this was a mistake, contact support@eisoluions.xyz</small></p></div></body></html>`;

export const Route = createFileRoute("/api/email/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const email = (url.searchParams.get("e") || "").toLowerCase().trim();
          if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const db = getDb();
            await setDoc(doc(db, "bulkEmailOptOuts", email), {
              email, reason: "user-unsubscribe", createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error("[email/unsubscribe] error", err);
        }
        return new Response(SUCCESS_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
