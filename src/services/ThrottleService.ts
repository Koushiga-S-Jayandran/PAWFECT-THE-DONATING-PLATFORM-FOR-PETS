/**
 * Throttle Service
 * Implements the atomic 3-tries-per-day rule per email hash with Asia/Kolkata unlock formatting.
 */

import type {
  ThrottleCheckResult,
} from '../domain/entities.js';
import type {
  ThrottleStore,
  Hasher,
  Clock,
} from '../domain/interfaces.js';
import { APP_CONFIG } from '../config/constants.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class ThrottleService {
  constructor(
    private throttleStore: ThrottleStore,
    private hasher: Hasher,
    private clock: Clock = new SystemClock()
  ) {}

  formatAsiaKolkataTime(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: APP_CONFIG.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  calculateUnlockTime(windowStartDate: Date): Date {
    return new Date(
      windowStartDate.getTime() + APP_CONFIG.lockoutHours * 60 * 60 * 1000
    );
  }

  async checkPreAttemptLock(email: string): Promise<ThrottleCheckResult> {
    const emailHash = await this.hasher.hashEmail(email);
    const existing = await this.throttleStore.getThrottle(emailHash);
    const now = this.clock.now();

    if (!existing) {
      return {
        status: 'ALLOWED',
        currentCount: 0,
        remainingTries: APP_CONFIG.maxPasswordAttempts,
        isLocked: false,
      };
    }

    const windowStart = new Date(existing.windowStart);
    const elapsed = now.getTime() - windowStart.getTime();
    const TWENTY_FOUR_HOURS = APP_CONFIG.lockoutHours * 60 * 60 * 1000;

    if (elapsed >= TWENTY_FOUR_HOURS) {
      return {
        status: 'ALLOWED',
        currentCount: 0,
        remainingTries: APP_CONFIG.maxPasswordAttempts,
        isLocked: false,
      };
    }

    if (existing.count >= 4) {
      const unlockTime = this.calculateUnlockTime(windowStart);
      const unlockFormatted = this.formatAsiaKolkataTime(unlockTime);
      return {
        status: 'LOCKED',
        currentCount: existing.count,
        remainingTries: 0,
        isLocked: true,
        unlockTime,
        unlockTimeFormatted: unlockFormatted,
        message: `Too many tries today. You can try again at ${unlockFormatted}, or reset your password by email now.`,
      };
    }

    const remaining = Math.max(0, APP_CONFIG.maxPasswordAttempts - existing.count);
    return {
      status: 'ALLOWED',
      currentCount: existing.count,
      remainingTries: remaining,
      isLocked: false,
    };
  }

  /**
   * Pre-increment before attempting signInWithEmailAndPassword.
   * If this attempt would reach or exceed 4, returns LOCKED without calling Firebase.
   */
  async recordAttemptBeforeSignIn(
    email: string
  ): Promise<ThrottleCheckResult> {
    const emailHash = await this.hasher.hashEmail(email);

    // First check existing state
    const preCheck = await this.checkPreAttemptLock(email);
    if (preCheck.isLocked) {
      return preCheck;
    }

    // Atomically increment counter
    const updated = await this.throttleStore.incrementBeforeAttempt(emailHash);
    const windowStart = new Date(updated.windowStart);
    const unlockTime = this.calculateUnlockTime(windowStart);
    const unlockFormatted = this.formatAsiaKolkataTime(unlockTime);

    if (updated.count >= 4) {
      return {
        status: 'LOCKED',
        currentCount: updated.count,
        remainingTries: 0,
        isLocked: true,
        unlockTime,
        unlockTimeFormatted: unlockFormatted,
        message: `Too many tries today. You can try again at ${unlockFormatted}, or reset your password by email now.`,
      };
    }

    const remaining = Math.max(0, APP_CONFIG.maxPasswordAttempts - updated.count);

    let message = '';
    if (remaining === 0) {
      message = `That was your last try today. Reset your password by email or try again at ${unlockFormatted}.`;
    } else {
      message = `That password isn't right. You have ${remaining} ${
        remaining === 1 ? 'try' : 'tries'
      } left today.`;
    }

    return {
      status: 'ALLOWED',
      currentCount: updated.count,
      remainingTries: remaining,
      isLocked: false,
      unlockTime,
      unlockTimeFormatted: unlockFormatted,
      message,
    };
  }

  async clearThrottleOnSuccess(email: string): Promise<void> {
    const emailHash = await this.hasher.hashEmail(email);
    await this.throttleStore.resetThrottle(emailHash);
  }
}
