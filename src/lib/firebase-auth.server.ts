/**
 * Server-side Firebase Auth token verification.
 * Uses Firebase's public keys endpoint to verify ID tokens without the Admin SDK.
 */

const FIREBASE_PROJECT_ID = "ei-fix";

/**
 * Verify a Firebase ID token by calling Google's tokeninfo endpoint.
 * Returns the decoded token payload or null if invalid.
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<{ uid: string; email?: string } | null> {
  if (!idToken || typeof idToken !== "string" || idToken.length < 100) {
    return null;
  }

  try {
    // Use Google's secure token verification endpoint
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=AIzaSyDCCMmXPtFxcylhjRNvlR5PFgLYwgzb12U`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) {
      console.error("[Firebase Auth] Token verification failed:", res.status);
      return null;
    }

    const data = await res.json();
    const user = data.users?.[0];
    if (!user?.localId) return null;

    return { uid: user.localId, email: user.email };
  } catch (err) {
    console.error("[Firebase Auth] Verification error:", err);
    return null;
  }
}
