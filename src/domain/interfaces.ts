/**
 * Domain Interfaces & Gateways
 * Small, decoupled interfaces enabling pure business logic and deterministic test doubles.
 */

import type {
  UserProfile,
  LoginThrottleDoc,
  VerificationThrottleDoc,
  AuthSessionUser,
  ThrottleCheckResult,
} from './entities.js';

export interface Clock {
  now(): Date;
}

export interface Hasher {
  hashEmail(email: string): Promise<string>;
}

export interface UserProfileRepository {
  createProfile(profile: UserProfile): Promise<void>;
  getProfile(uid: string): Promise<UserProfile | null>;
  updateProfile(uid: string, data: Partial<Pick<UserProfile, 'fullName' | 'phone'>>): Promise<void>;
}

export interface ThrottleStore {
  getThrottle(emailHash: string): Promise<LoginThrottleDoc | null>;
  incrementBeforeAttempt(emailHash: string): Promise<LoginThrottleDoc>;
  resetThrottle(emailHash: string): Promise<void>;
  
  getVerificationThrottle(emailHash: string): Promise<VerificationThrottleDoc | null>;
  recordVerificationAttempt(emailHash: string): Promise<VerificationThrottleDoc>;
}

export interface AuthGateway {
  getCurrentUser(): AuthSessionUser | null;
  onAuthStateChanged(callback: (user: AuthSessionUser | null) => void): () => void;
  fetchSignInMethods(email: string): Promise<string[]>;
  createUser(email: string, password: string): Promise<{ uid: string; email: string }>;
  signIn(email: string, password: string): Promise<AuthSessionUser>;
  sendEmailVerification(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  verifyPasswordResetCode(code: string): Promise<string>;
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;
  signOut(): Promise<void>;
}
