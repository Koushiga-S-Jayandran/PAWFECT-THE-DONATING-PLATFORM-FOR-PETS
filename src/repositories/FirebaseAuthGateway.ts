/**
 * Firebase Authentication Gateway Implementation
 * Decouples Firebase Auth modular SDK from business logic services.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendEmailVerification as fbSendEmailVerification,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  verifyPasswordResetCode as fbVerifyPasswordResetCode,
  confirmPasswordReset as fbConfirmPasswordReset,
  fetchSignInMethodsForEmail,
  onAuthStateChanged as fbOnAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../config/firebase.js';
import type { AuthSessionUser } from '../domain/entities.js';
import type { AuthGateway } from '../domain/interfaces.js';

function mapFirebaseUser(user: User | null): AuthSessionUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
  };
}

export class FirebaseAuthGateway implements AuthGateway {
  getCurrentUser(): AuthSessionUser | null {
    return mapFirebaseUser(auth.currentUser);
  }

  onAuthStateChanged(
    callback: (user: AuthSessionUser | null) => void
  ): () => void {
    return fbOnAuthStateChanged(auth, (user) => {
      callback(mapFirebaseUser(user));
    });
  }

  async fetchSignInMethods(email: string): Promise<string[]> {
    try {
      return await fetchSignInMethodsForEmail(auth, email);
    } catch (error: any) {
      // If email enumeration protection is on, fetchSignInMethodsForEmail may return empty or throw
      console.warn('fetchSignInMethods warning:', error?.code || error?.message);
      return [];
    }
  }

  async createUser(
    email: string,
    password: string
  ): Promise<{ uid: string; email: string }> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return {
      uid: cred.user.uid,
      email: cred.user.email || email,
    };
  }

  async signIn(email: string, password: string): Promise<AuthSessionUser> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const mapped = mapFirebaseUser(cred.user);
    if (!mapped) {
      throw new Error('Authentication failed: no session created.');
    }
    return mapped;
  }

  async sendEmailVerification(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in to verify.');
    }
    await fbSendEmailVerification(user, {
      url: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'https://pawfect.org.in/dashboard',
      handleCodeInApp: false,
    });
  }

  async sendPasswordReset(email: string): Promise<void> {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://pawfect.org.in';
    await fbSendPasswordResetEmail(auth, email, {
      url: `${origin}/reset`,
      handleCodeInApp: true,
    });
  }

  async verifyPasswordResetCode(code: string): Promise<string> {
    return await fbVerifyPasswordResetCode(auth, code);
  }

  async confirmPasswordReset(
    code: string,
    newPassword: string
  ): Promise<void> {
    await fbConfirmPasswordReset(auth, code, newPassword);
  }

  async signOut(): Promise<void> {
    await fbSignOut(auth);
  }
}
