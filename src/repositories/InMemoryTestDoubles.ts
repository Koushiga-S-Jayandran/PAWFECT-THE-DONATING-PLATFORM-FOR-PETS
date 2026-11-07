/**
 * In-Memory Test Doubles
 * Matches the exact contracts of Firebase implementations for deterministic testing.
 */

import type {
  UserProfile,
  LoginThrottleDoc,
  VerificationThrottleDoc,
  AuthSessionUser,
} from '../domain/entities.js';
import type {
  AuthGateway,
  UserProfileRepository,
  ThrottleStore,
  Clock,
  Hasher,
} from '../domain/interfaces.js';
import { normalizeEmail } from '../security/hash.js';

export class TestClock implements Clock {
  private currentTime: Date;

  constructor(initialTime?: Date) {
    this.currentTime = initialTime ? new Date(initialTime) : new Date();
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  advanceHours(hours: number): void {
    this.currentTime = new Date(
      this.currentTime.getTime() + hours * 60 * 60 * 1000
    );
  }

  advanceSeconds(seconds: number): void {
    this.currentTime = new Date(
      this.currentTime.getTime() + seconds * 1000
    );
  }

  setTime(time: Date): void {
    this.currentTime = new Date(time);
  }
}

export class SimpleTestHasher implements Hasher {
  async hashEmail(email: string): Promise<string> {
    const norm = normalizeEmail(email);
    // Simple deterministic hex representation for unit tests
    let hash = 0;
    for (let i = 0; i < norm.length; i++) {
      hash = (hash << 5) - hash + norm.charCodeAt(i);
      hash |= 0;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }
}

export class InMemoryUserProfileRepository implements UserProfileRepository {
  public profiles: Map<string, UserProfile> = new Map();

  async createProfile(profile: UserProfile): Promise<void> {
    if (this.profiles.has(profile.uid)) {
      throw new Error(`Profile already exists for uid: ${profile.uid}`);
    }
    this.profiles.set(profile.uid, { ...profile });
  }

  async getProfile(uid: string): Promise<UserProfile | null> {
    const found = this.profiles.get(uid);
    return found ? { ...found } : null;
  }

  async updateProfile(
    uid: string,
    data: Partial<Pick<UserProfile, 'fullName' | 'phone'>>
  ): Promise<void> {
    const existing = this.profiles.get(uid);
    if (!existing) {
      throw new Error(`Profile not found for uid: ${uid}`);
    }
    this.profiles.set(uid, {
      ...existing,
      ...data,
      role: existing.role, // immutable
      createdAt: existing.createdAt, // immutable
      consentAt: existing.consentAt, // immutable
    });
  }
}

export class InMemoryThrottleStore implements ThrottleStore {
  public loginThrottles: Map<string, LoginThrottleDoc> = new Map();
  public verificationThrottles: Map<string, VerificationThrottleDoc> = new Map();
  private clock: Clock;

  constructor(clock: Clock = new TestClock()) {
    this.clock = clock;
  }

  async getThrottle(emailHash: string): Promise<LoginThrottleDoc | null> {
    const item = this.loginThrottles.get(emailHash);
    return item ? { ...item } : null;
  }

  async incrementBeforeAttempt(emailHash: string): Promise<LoginThrottleDoc> {
    const now = this.clock.now();
    const existing = this.loginThrottles.get(emailHash);

    if (!existing) {
      const created: LoginThrottleDoc = {
        count: 1,
        windowStart: now.toISOString(),
      };
      this.loginThrottles.set(emailHash, created);
      return created;
    }

    const elapsed = now.getTime() - new Date(existing.windowStart).getTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (elapsed >= TWENTY_FOUR_HOURS) {
      const reset: LoginThrottleDoc = {
        count: 1,
        windowStart: now.toISOString(),
      };
      this.loginThrottles.set(emailHash, reset);
      return reset;
    }

    if (existing.count >= 4) {
      return { ...existing };
    }

    const nextCount = existing.count + 1;
    const updated: LoginThrottleDoc = {
      count: nextCount,
      windowStart: existing.windowStart,
    };
    this.loginThrottles.set(emailHash, updated);
    return updated;
  }

  async resetThrottle(emailHash: string): Promise<void> {
    this.loginThrottles.delete(emailHash);
  }

  async getVerificationThrottle(
    emailHash: string
  ): Promise<VerificationThrottleDoc | null> {
    const item = this.verificationThrottles.get(emailHash);
    return item ? { ...item } : null;
  }

  async recordVerificationAttempt(
    emailHash: string
  ): Promise<VerificationThrottleDoc> {
    const now = this.clock.now();
    const existing = this.verificationThrottles.get(emailHash);
    const ONE_HOUR = 60 * 60 * 1000;

    if (!existing) {
      const created: VerificationThrottleDoc = {
        count: 1,
        windowStart: now.toISOString(),
        lastSentAt: now.toISOString(),
      };
      this.verificationThrottles.set(emailHash, created);
      return created;
    }

    const elapsed = now.getTime() - new Date(existing.windowStart).getTime();
    if (elapsed >= ONE_HOUR) {
      const reset: VerificationThrottleDoc = {
        count: 1,
        windowStart: now.toISOString(),
        lastSentAt: now.toISOString(),
      };
      this.verificationThrottles.set(emailHash, reset);
      return reset;
    }

    const nextCount = Math.min(existing.count + 1, 3);
    const updated: VerificationThrottleDoc = {
      count: nextCount,
      windowStart: existing.windowStart,
      lastSentAt: now.toISOString(),
    };
    this.verificationThrottles.set(emailHash, updated);
    return updated;
  }
}

export class InMemoryAuthGateway implements AuthGateway {
  private currentUser: AuthSessionUser | null = null;
  private users: Map<string, { email: string; pass: string; emailVerified: boolean }> =
    new Map();
  private authListeners: Array<(u: AuthSessionUser | null) => void> = [];

  getCurrentUser(): AuthSessionUser | null {
    return this.currentUser ? { ...this.currentUser } : null;
  }

  onAuthStateChanged(
    callback: (user: AuthSessionUser | null) => void
  ): () => void {
    this.authListeners.push(callback);
    callback(this.getCurrentUser());
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    for (const l of this.authListeners) {
      l(this.getCurrentUser());
    }
  }

  async fetchSignInMethods(email: string): Promise<string[]> {
    const norm = normalizeEmail(email);
    for (const u of this.users.values()) {
      if (u.email === norm) return ['password'];
    }
    return [];
  }

  async createUser(
    email: string,
    password: string
  ): Promise<{ uid: string; email: string }> {
    const norm = normalizeEmail(email);
    for (const [id, u] of this.users.entries()) {
      if (u.email === norm) {
        throw new Error('auth/email-already-in-use');
      }
    }
    const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.users.set(uid, { email: norm, pass: password, emailVerified: false });
    this.currentUser = {
      uid,
      email: norm,
      emailVerified: false,
      displayName: null,
    };
    this.notifyListeners();
    return { uid, email: norm };
  }

  async signIn(email: string, password: string): Promise<AuthSessionUser> {
    const norm = normalizeEmail(email);
    for (const [id, u] of this.users.entries()) {
      if (u.email === norm) {
        if (u.pass !== password) {
          throw new Error('auth/wrong-password');
        }
        this.currentUser = {
          uid: id,
          email: u.email,
          emailVerified: u.emailVerified,
          displayName: null,
        };
        this.notifyListeners();
        return { ...this.currentUser };
      }
    }
    throw new Error('auth/user-not-found');
  }

  async sendEmailVerification(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user is currently signed in');
    }
    // Simulation
  }

  async sendPasswordReset(email: string): Promise<void> {
    // Always succeed
  }

  async verifyPasswordResetCode(code: string): Promise<string> {
    if (code === 'invalid') {
      throw new Error('auth/invalid-action-code');
    }
    return 'user@example.com';
  }

  async confirmPasswordReset(
    code: string,
    newPassword: string
  ): Promise<void> {
    if (code === 'invalid') {
      throw new Error('auth/invalid-action-code');
    }
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    this.notifyListeners();
  }

  // Test helper
  markEmailVerified(uid: string) {
    const u = this.users.get(uid);
    if (u) {
      u.emailVerified = true;
      if (this.currentUser?.uid === uid) {
        this.currentUser.emailVerified = true;
      }
      this.notifyListeners();
    }
  }
}
