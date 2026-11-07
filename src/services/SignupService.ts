/**
 * Signup Service
 * Handles user registration, ABAC profile creation, verification email dispatch,
 * immediate signout of unverified sessions, and pre-hijacking prevention.
 */

import type {
  AuthGateway,
  UserProfileRepository,
} from '../domain/interfaces.js';
import type { SignupFormData } from '../security/validation.js';
import { APP_CONFIG } from '../config/constants.js';

export interface SignupResult {
  success: boolean;
  isExistingUnverified?: boolean;
  isExistingVerified?: boolean;
  email: string;
  uid?: string;
  message?: string;
}

export class SignupService {
  constructor(
    private authGateway: AuthGateway,
    private userProfileRepo: UserProfileRepository
  ) {}

  async registerUser(data: SignupFormData): Promise<SignupResult> {
    const normalizedEmail = data.email;

    // 1. Check if email already registered
    try {
      const methods = await this.authGateway.fetchSignInMethods(normalizedEmail);
      if (methods && methods.length > 0) {
        // Account exists
        return {
          success: false,
          isExistingUnverified: true,
          email: normalizedEmail,
          message:
            'This email is already in use. If you created this account, please confirm your email or reset your password.',
        };
      }
    } catch {
      // In case enumeration protection obscures lookup, proceed to create
    }

    try {
      // 2. Create Auth Account
      const created = await this.authGateway.createUser(
        normalizedEmail,
        data.password
      );

      // 3. Write User Profile to Firestore (role fixed to DONOR)
      const nowIso = new Date().toISOString();
      await this.userProfileRepo.createProfile({
        uid: created.uid,
        fullName: data.fullName.trim(),
        phone: data.phone,
        consentAt: nowIso,
        consentVersion: APP_CONFIG.consentVersion,
        role: 'DONOR',
        createdAt: nowIso,
      });

      // 4. Send Verification Email
      await this.authGateway.sendEmailVerification();

      // 5. Sign the user out immediately to guarantee no unverified session
      await this.authGateway.signOut();

      return {
        success: true,
        email: normalizedEmail,
        uid: created.uid,
        message: 'Account created! Please check your email to verify your address.',
      };
    } catch (error: any) {
      // Always sign out on error if a session was created
      await this.authGateway.signOut().catch(() => {});

      if (error?.code === 'auth/email-already-in-use') {
        return {
          success: false,
          isExistingUnverified: true,
          email: normalizedEmail,
          message:
            'This email is already registered. If this is your account, check your inbox or reset your password.',
        };
      }

      const humanMessage =
        error?.message?.replace(/Firebase: /i, '') ||
        'Unable to complete registration. Please check your details and try again.';
      throw new Error(humanMessage);
    }
  }
}
