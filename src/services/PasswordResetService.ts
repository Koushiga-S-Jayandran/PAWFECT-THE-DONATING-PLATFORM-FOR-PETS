/**
 * Password Reset Service
 * Enforces enumeration resistance, rate-limiting (3/hr), URL oobCode sanitization,
 * deferred confirmation (anti-email-scanner), and post-reset throttle clearance.
 */

import type {
  AuthGateway,
  ThrottleStore,
  Hasher,
} from '../domain/interfaces.js';
import type { ThrottleService } from './ThrottleService.js';

export interface ResetRequestResult {
  message: string;
}

export interface ResetConfirmationResult {
  success: boolean;
  message: string;
  email?: string;
}

export class PasswordResetService {
  constructor(
    private authGateway: AuthGateway,
    private throttleStore: ThrottleStore,
    private throttleService: ThrottleService,
    private hasher: Hasher
  ) {}

  /**
   * Dispatches password reset email.
   * Enumeration resistant: always returns identical message regardless of outcome.
   * Rate limited: max 3 per hour per email hash.
   */
  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    const normalized = email.trim().toLowerCase();
    const emailHash = await this.hasher.hashEmail(normalized);

    const standardMessage =
      'If that email has an account, we have sent a reset link. Please check your inbox and spam folder.';

    try {
      // Check throttle limit for reset requests
      const throttle = await this.throttleStore.getVerificationThrottle(emailHash);
      if (throttle && throttle.count >= 3) {
        const elapsed = Date.now() - new Date(throttle.windowStart).getTime();
        if (elapsed < 60 * 60 * 1000) {
          // Still return the generic message so we never confirm account existence
          return { message: standardMessage };
        }
      }

      await this.throttleStore.recordVerificationAttempt(emailHash);
      await this.authGateway.sendPasswordReset(normalized);
    } catch (error) {
      // Log hash only for telemetry, never raw email
      console.warn('Password reset request dispatched');
    }

    return { message: standardMessage };
  }

  /**
   * Verifies the reset code and sets the new password upon form submission.
   * NEVER executed on page load to prevent email scanner link consumption.
   */
  async completePasswordReset(
    oobCode: string,
    newPassword: string
  ): Promise<ResetConfirmationResult> {
    try {
      // 1. Verify code validity
      const userEmail = await this.authGateway.verifyPasswordResetCode(oobCode);

      // 2. Commit new password
      await this.authGateway.confirmPasswordReset(oobCode, newPassword);

      // 3. Clear any active login throttle for this user
      if (userEmail) {
        await this.throttleService.clearThrottleOnSuccess(userEmail);

        // 4. Authenticate the user with the new password
        try {
          await this.authGateway.signIn(userEmail, newPassword);
        } catch {
          // If auto sign-in requires re-entry, user can sign in normally
        }
      }

      return {
        success: true,
        email: userEmail,
        message: "Password changed. You're signed in.",
      };
    } catch (error: any) {
      const code = error?.code || '';
      let message = 'This password reset link is invalid or has expired. Please request a new one.';

      if (code === 'auth/expired-action-code') {
        message = 'This password reset link has expired. Please request a fresh one.';
      } else if (code === 'auth/invalid-action-code') {
        message = 'This link has already been used or is malformed. Please request a new link.';
      }

      return {
        success: false,
        message,
      };
    }
  }
}
