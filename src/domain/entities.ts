/**
 * Domain Entities
 * Strict types representing core business models and security constructs.
 */

export type UserRole = 'DONOR';

export interface UserProfile {
  uid: string;
  fullName: string;
  phone: string;
  consentAt: string;
  consentVersion: string;
  role: UserRole;
  createdAt: string;
}

export interface LoginThrottleDoc {
  count: number;
  windowStart: string;
}

export interface VerificationThrottleDoc {
  count: number;
  windowStart: string;
  lastSentAt: string;
}

export type ThrottleStatus = 'ALLOWED' | 'LOCKED';

export interface ThrottleCheckResult {
  status: ThrottleStatus;
  currentCount: number;
  remainingTries: number;
  isLocked: boolean;
  unlockTime?: Date;
  unlockTimeFormatted?: string;
  message?: string;
}

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}
