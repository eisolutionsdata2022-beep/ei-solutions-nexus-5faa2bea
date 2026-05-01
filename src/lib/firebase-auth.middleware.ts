/**
 * Firebase auth middleware for server functions.
 * Client side: attaches Firebase ID token to the request.
 * Server side: verifies the token and provides user context.
 */
import { createMiddleware } from "@tanstack/react-start";
import { auth } from "./firebase";
import { verifyFirebaseToken } from "./firebase-auth.server";

export const firebaseAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    let idToken = "";
    try {
      const user = auth.currentUser;
      if (user) {
        idToken = await user.getIdToken();
      }
    } catch {
      // No user signed in
    }
    return next({
      sendContext: { firebaseIdToken: idToken },
    });
  })
  .server(async ({ next, context }) => {
    const token = (context as any).firebaseIdToken as string;
    const authUser = token ? await verifyFirebaseToken(token) : null;
    return next({
      context: { authUser, firebaseIdToken: token || "" },
    });
  });
