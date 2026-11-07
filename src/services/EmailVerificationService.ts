/**
 * Email Verification Service
 * Enforces a 60-second cooldown and a maximum of 3 resends per hour per email hash.
 */

import type {
  AuthGateway,
  ThrottleStore,
  Hasher,
} from '../domain/interfaces.js';
import { APP_CONFIG } from '../config/constants.js';

export interface ResendVerificationResult {
  success: boolean;
  message: string;
  cooldownRemainingSeconds?: number;
}

export class EmailVerificationService {
  constructor(
    private authGateway: AuthGateway,
    private throttleStore: ThrottleStore,
    private hasher: Hasher
  ) {}

  async resendVerificationEmail(
    email: string
  ): Promise<ResendVerificationResult> {
    const normalized = email.trim().toLowerCase();
    const emailHash = await this.hasher.hashEmail(normalized);

    const existing = await this.throttleStore.getVerificationThrottle(emailHash);
    const now = Date.now();

    if (existing) {
      const lastSentTime = new Date(existing.lastSentAt).getTime();
      const elapsedSeconds = Math.floor((now - lastSentTime) / 1000);

      // Check 60-second cooldown
      if (elapsedSeconds < APP_CONFIG.verificationCooldownSeconds) {
        const remaining = APP_CONFIG.verificationCooldownSeconds - elapsedSeconds;
        return {
          success: false,
          cooldownRemainingSeconds: remaining,
          message: `Please wait ${remaining} seconds before requesting another email.`,
        };
      }

      // Check 3 per hour limit
      const windowStartTime = new Date(existing.windowStart).getTime();
      const elapsedWindow = now - windowStartTime;
      const ONE_HOUR = 60 * 60 * 1000;

      if (elapsedWindow < ONE_HOUR && existing.count >= APP_CONFIG.maxVerificationPerHour) {
        return {
          success: false,
          message: 'You have reached the maximum of 3 verification emails for this hour. Please try again later or check your spam folder.',
        };
      }
    }

    try {
      await this.throttleStore.recordVerificationAttempt(emailHash);
      // In Firebase modular SDK, sendEmailVerification needs currentUser or password reset link can also serve verification
      const currentUser = this.authGateway.getCurrentUser();
      if (currentUser && currentUser.email === normalized) {
        await this.authGateway.sendEmailVerification();
      } else {
        // If not actively signed in, send verification link / reset
        await this.authGateway.sendPasswordReset(normalized);
      }

      return {
        success: true,
        message: 'A fresh verification email has been sent. Please check your inbox.',
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          'Unable to send verification email at this moment. Please try again shortly.',
      };
    }
  }
}
