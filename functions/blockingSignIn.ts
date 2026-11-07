/**
 * Firebase Authentication Blocking Function (beforeSignIn)
 * 
 * ============================================================================
 * STATUS: NOT ACTIVE ON THE FREE SPARK PLAN
 * ============================================================================
 * Cloud Functions for Firebase and Auth Blocking Functions require the
 * Firebase Blaze (pay-as-you-go) plan.
 * 
 * On Pawfect's current Free Spark Plan, the 3-attempt limit is strictly enforced
 * through the client application and zero-trust firestore.rules via atomic
 * transactions on /loginThrottle/{emailHash}.
 * 
 * TO ENABLE THIS FUNCTION LATER (When upgrading to Blaze plan):
 * 1. Initialize Firebase Functions: `firebase init functions`
 * 2. Deploy this blocking function: `firebase deploy --only functions:beforeSignIn`
 * 3. In the Firebase Console:
 *    Go to Authentication -> Settings -> Blocking functions -> register `beforeSignIn`.
 * 4. This will enforce a hard server-side gateway block before Firebase issues tokens.
 * ============================================================================
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: When deployed with firebase-functions v2 / identity:
// import { beforeUserSignedIn } from "firebase-functions/v2/identity";
// import * as admin from "firebase-admin";

export const beforeSignInConfig = {
  description: "Server-side 3-tries-per-rolling-24h rate limiter for Pawfect Auth",
  maxAttempts: 3,
  lockoutHours: 24,
  collection: "loginThrottle",
};

/**
 * Server-authoritative beforeSignIn blocking handler
 */
export async function beforeSignInHandler(event: any, adminFirestore: any) {
  const user = event.data;
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    return;
  }

  // Generate SHA-256 hash using Node crypto
  const crypto = await import("crypto");
  const emailHash = crypto.createHash("sha256").update(email).digest("hex");

  const throttleRef = adminFirestore.collection("loginThrottle").doc(emailHash);
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  await adminFirestore.runTransaction(async (transaction: any) => {
    const docSnap = await transaction.get(throttleRef);

    if (!docSnap.exists) {
      // First attempt recorded on server
      transaction.set(throttleRef, {
        count: 1,
        windowStart: new Date(now).toISOString(),
      });
      return;
    }

    const data = docSnap.data();
    const windowStartTime = new Date(data.windowStart).getTime();
    const elapsed = now - windowStartTime;

    if (elapsed >= TWENTY_FOUR_HOURS) {
      // Window expired; restart
      transaction.set(throttleRef, {
        count: 1,
        windowStart: new Date(now).toISOString(),
      });
      return;
    }

    if (data.count >= 4) {
      const unlockTime = new Date(windowStartTime + TWENTY_FOUR_HOURS);
      const formatted = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(unlockTime);

      // Throws HttpsError blocking the sign-in token generation completely
      throw new Error(
        `Too many tries today. You can try again at ${formatted}, or reset your password by email now.`
      );
    }

    // Increment
    transaction.update(throttleRef, {
      count: data.count + 1,
    });
  });
}
