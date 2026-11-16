/**
 * Phone OTP Verification Service
 * Uses an isolated secondary Firebase Auth app instance for Phone Auth + RecaptchaVerifier
 * so verifying the lister's contact phone NEVER mutates or signs out their primary email session.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { isValidIndianMobile, normalizeIndianMobile } from '../security/adoptionListingValidation.js';

const OTP_SECONDARY_APP_NAME = 'pawfect-otp-verifier';

export interface OtpSendResult {
  confirmationResult: ConfirmationResult;
  normalizedPhone: string;
}

export interface PhoneOtpProvider {
  sendOtp(phone: string, recaptchaContainerId: string): Promise<OtpSendResult>;
  confirmOtp(confirmation: ConfirmationResult, code: string): Promise<{ verifiedAt: string }>;
  reset(): void;
}

function getSecondaryAuth(): Auth {
  const existingApp: FirebaseApp | undefined = getApps().find(
    (app) => app.name === OTP_SECONDARY_APP_NAME
  );
  const secondaryApp = existingApp ?? initializeApp(firebaseConfig, OTP_SECONDARY_APP_NAME);
  return getAuth(secondaryApp);
}

export class FirebasePhoneOtpService implements PhoneOtpProvider {
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  async sendOtp(phone: string, recaptchaContainerId: string): Promise<OtpSendResult> {
    const normalizedPhone = normalizeIndianMobile(phone);
    if (!isValidIndianMobile(normalizedPhone)) {
      throw new Error('Enter a valid 10-digit Indian mobile number starting with 6-9.');
    }

    const containerEl =
      typeof document !== 'undefined' ? document.getElementById(recaptchaContainerId) : null;
    if (!containerEl) {
      throw new Error('Verification widget is not ready yet. Please try again.');
    }

    this.reset();
    const secondaryAuth = getSecondaryAuth();
    secondaryAuth.languageCode = 'en';

    this.recaptchaVerifier = new RecaptchaVerifier(secondaryAuth, recaptchaContainerId, {
      size: 'invisible',
    });

    try {
      const confirmationResult = await signInWithPhoneNumber(
        secondaryAuth,
        normalizedPhone,
        this.recaptchaVerifier
      );
      return { confirmationResult, normalizedPhone };
    } catch (err: any) {
      this.reset();
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/billing-not-enabled') {
        throw new Error(
          'SMS OTP service is not enabled on the Firebase project yet. Enable Phone Sign-In in Firebase Authentication to send OTP codes.'
        );
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Too many OTP attempts from this device. Please wait a few minutes.');
      }
      if (code === 'auth/invalid-phone-number') {
        throw new Error('Please enter a valid 10-digit Indian mobile number.');
      }
      throw new Error(err?.message || 'Could not send OTP verification code.');
    }
  }

  async confirmOtp(
    confirmation: ConfirmationResult,
    code: string
  ): Promise<{ verifiedAt: string }> {
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      throw new Error('Enter the 6-digit OTP code sent to your mobile.');
    }

    try {
      await confirmation.confirm(trimmedCode);
      const secondaryAuth = getSecondaryAuth();
      await signOut(secondaryAuth).catch(() => {});
      this.reset();
      return { verifiedAt: new Date().toISOString() };
    } catch (err: any) {
      const errCode = err?.code || '';
      if (errCode === 'auth/invalid-verification-code') {
        throw new Error('Incorrect OTP code. Please check and try again.');
      }
      if (errCode === 'auth/code-expired') {
        throw new Error('OTP code has expired. Please request a new code.');
      }
      throw new Error(err?.message || 'Failed to verify OTP code.');
    }
  }

  reset(): void {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
      } catch {
        // ignore cleanup failure
      }
      this.recaptchaVerifier = null;
    }
  }
}

export const phoneOtpService = new FirebasePhoneOtpService();
