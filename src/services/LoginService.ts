/**
 * Login Service
 * Coordinates atomic 3-try throttling before auth invocation,
 * unverified session rejection, and throttle clearance upon success.
 */

import type { AuthSessionUser } from '../domain/entities.js';
import type { AuthGateway } from '../domain/interfaces.js';
import type { ThrottleService } from './ThrottleService.js';

export type LoginResultStatus =
  | 'SUCCESS'
  | 'LOCKED'
  | 'WRONG_PASSWORD'
  | 'UNVERIFIED_EMAIL'
  | 'USER_NOT_FOUND'
  | 'ERROR';

export interface LoginResult {
  status: LoginResultStatus;
  user?: AuthSessionUser;
  email: string;
  message: string;
  remainingTries?: number;
  unlockTimeFormatted?: string;
}

export class LoginService {
  constructor(
    private authGateway: AuthGateway,
    private throttleService: ThrottleService
  ) {}

  async authenticate(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Atomic pre-increment of login throttle BEFORE calling Firebase
    const throttleAttempt =
      await this.throttleService.recordAttemptBeforeSignIn(normalizedEmail);

    if (throttleAttempt.isLocked) {
      return {
        status: 'LOCKED',
        email: normalizedEmail,
        remainingTries: 0,
        unlockTimeFormatted: throttleAttempt.unlockTimeFormatted,
        message:
          throttleAttempt.message ||
          'Too many tries today. Reset your password by email or try again later.',
      };
    }

    try {
      // 2. Call Firebase Auth signIn
      const sessionUser = await this.authGateway.signIn(
        normalizedEmail,
        password
      );

      // 3. Verify Email Status
      if (!sessionUser.emailVerified) {
        // Sign user out immediately to prevent unverified session usage
        await this.authGateway.signOut();
        return {
          status: 'UNVERIFIED_EMAIL',
          email: normalizedEmail,
          message:
            'Please confirm your email address before signing in. Check your inbox for the confirmation link.',
        };
      }

      // 4. On verified success: clear the throttle document
      await this.throttleService.clearThrottleOnSuccess(normalizedEmail);

      return {
        status: 'SUCCESS',
        email: normalizedEmail,
        user: sessionUser,
        message: "You're signed in.",
      };
    } catch (error: any) {
      const code = error?.code || '';

      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found'
      ) {
        return {
          status: 'WRONG_PASSWORD',
          email: normalizedEmail,
          remainingTries: throttleAttempt.remainingTries,
          unlockTimeFormatted: throttleAttempt.unlockTimeFormatted,
          message:
            throttleAttempt.message ||
            `That password isn't right. You have ${throttleAttempt.remainingTries} tries left today.`,
        };
      }

      if (code === 'auth/too-many-requests') {
        return {
          status: 'LOCKED',
          email: normalizedEmail,
          remainingTries: 0,
          unlockTimeFormatted: throttleAttempt.unlockTimeFormatted,
          message:
            'Access temporarily disabled due to multiple failed attempts. Please reset your password or try again later.',
        };
      }

      return {
        status: 'ERROR',
        email: normalizedEmail,
        remainingTries: throttleAttempt.remainingTries,
        message:
          'Unable to sign in at this time. Please check your internet connection or try again.',
      };
    }
  }
}
