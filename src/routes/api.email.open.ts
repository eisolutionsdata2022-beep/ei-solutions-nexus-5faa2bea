import { createFileRoute } from "@tanstack/react-router";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc, increment } from "firebase/firestore";

// 1x1 transparent GIF
const PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

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

export const Route = createFileRoute("/api/email/open")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const campaignId = url.searchParams.get("c");
          const recipientId = url.searchParams.get("r");
          if (campaignId && recipientId) {
            const db = getDb();
            const recRef = doc(db, "bulkEmailRecipients", recipientId);
            const snap = await getDoc(recRef);
            if (snap.exists() && snap.data().status !== "opened") {
              await updateDoc(recRef, {
                status: "opened",
                openedAt: new Date().toISOString(),
              });
              await updateDoc(doc(db, "bulkEmailCampaigns", campaignId), {
                openedCount: increment(1),
              }).catch(() => {});
            }
          }
        } catch (err) {
          console.error("[email/open] tracking error", err);
        }

        return new Response(PIXEL, {
          status: 200,
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });
      },
    },
  },
});
