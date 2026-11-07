/**
 * Firestore Throttle Store Implementation
 * Uses Firestore Transactions for atomic counter mutations before authentication calls.
 */

import {
  doc,
  getDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase.js';
import type {
  LoginThrottleDoc,
  VerificationThrottleDoc,
} from '../domain/entities.js';
import type { ThrottleStore } from '../domain/interfaces.js';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export class FirebaseThrottleStore implements ThrottleStore {
  async getThrottle(emailHash: string): Promise<LoginThrottleDoc | null> {
    const path = `loginThrottle/${emailHash}`;
    try {
      const snap = await getDoc(doc(db, 'loginThrottle', emailHash));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        count: data.count,
        windowStart:
          typeof data.windowStart === 'string'
            ? data.windowStart
            : data.windowStart?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async incrementBeforeAttempt(emailHash: string): Promise<LoginThrottleDoc> {
    const path = `loginThrottle/${emailHash}`;
    const throttleRef = doc(db, 'loginThrottle', emailHash);

    try {
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(throttleRef);
        const now = new Date();
        const nowIso = now.toISOString();

        if (!snap.exists()) {
          const newDoc: LoginThrottleDoc = {
            count: 1,
            windowStart: nowIso,
          };
          transaction.set(throttleRef, newDoc);
          return newDoc;
        }

        const data = snap.data();
        const rawWindowStart = data.windowStart;
        const windowStartDate =
          typeof rawWindowStart === 'string'
            ? new Date(rawWindowStart)
            : rawWindowStart?.toDate?.() || now;
        const elapsed = now.getTime() - windowStartDate.getTime();

        // If 24 hours have elapsed, restart the rolling window
        if (elapsed >= TWENTY_FOUR_HOURS_MS) {
          const resetDoc: LoginThrottleDoc = {
            count: 1,
            windowStart: nowIso,
          };
          transaction.set(throttleRef, resetDoc);
          return resetDoc;
        }

        // If already locked at 4 or more, do not exceed 4
        if (data.count >= 4) {
          return {
            count: 4,
            windowStart: windowStartDate.toISOString(),
          };
        }

        // Increment by exactly +1
        const nextCount = data.count + 1;
        const updatedDoc: LoginThrottleDoc = {
          count: nextCount,
          windowStart: windowStartDate.toISOString(),
        };

        transaction.update(throttleRef, {
          count: nextCount,
          windowStart: windowStartDate.toISOString(),
        });

        return updatedDoc;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async resetThrottle(emailHash: string): Promise<void> {
    const path = `loginThrottle/${emailHash}`;
    try {
      await deleteDoc(doc(db, 'loginThrottle', emailHash));
    } catch (error) {
      // Deleting non-existent throttle or unverified error is handled gracefully
      console.warn('Could not reset login throttle:', error);
    }
  }

  async getVerificationThrottle(
    emailHash: string
  ): Promise<VerificationThrottleDoc | null> {
    const path = `verificationThrottle/${emailHash}`;
    try {
      const snap = await getDoc(doc(db, 'verificationThrottle', emailHash));
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        count: data.count,
        windowStart:
          typeof data.windowStart === 'string'
            ? data.windowStart
            : data.windowStart?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        lastSentAt:
          typeof data.lastSentAt === 'string'
            ? data.lastSentAt
            : data.lastSentAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async recordVerificationAttempt(
    emailHash: string
  ): Promise<VerificationThrottleDoc> {
    const path = `verificationThrottle/${emailHash}`;
    const throttleRef = doc(db, 'verificationThrottle', emailHash);

    try {
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(throttleRef);
        const now = new Date();
        const nowIso = now.toISOString();

        if (!snap.exists()) {
          const newDoc: VerificationThrottleDoc = {
            count: 1,
            windowStart: nowIso,
            lastSentAt: nowIso,
          };
          transaction.set(throttleRef, newDoc);
          return newDoc;
        }

        const data = snap.data();
        const windowStartDate = new Date(data.windowStart || nowIso);
        const elapsed = now.getTime() - windowStartDate.getTime();

        // Reset if 1 hour has passed
        if (elapsed >= ONE_HOUR_MS) {
          const resetDoc: VerificationThrottleDoc = {
            count: 1,
            windowStart: nowIso,
            lastSentAt: nowIso,
          };
          transaction.set(throttleRef, resetDoc);
          return resetDoc;
        }

        const nextCount = Math.min(data.count + 1, 3);
        const updatedDoc: VerificationThrottleDoc = {
          count: nextCount,
          windowStart: windowStartDate.toISOString(),
          lastSentAt: nowIso,
        };

        transaction.update(throttleRef, {
          count: nextCount,
          lastSentAt: nowIso,
        });

        return updatedDoc;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}
