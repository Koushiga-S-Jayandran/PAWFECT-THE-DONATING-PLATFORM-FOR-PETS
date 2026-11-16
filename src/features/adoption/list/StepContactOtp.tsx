import React, { useState } from 'react';
import { ShieldCheck, Lock, Loader2, CheckCircle2, Phone } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import type { ListingFormDraft } from '../../../domain/adoptionListingEntities.js';
import {
  isValidIndianMobile,
  normalizeIndianMobile,
} from '../../../security/adoptionListingValidation.js';
import { phoneOtpService } from '../../../services/PhoneOtpService.js';

interface StepContactOtpProps {
  draft: ListingFormDraft;
  onChange: (patch: Partial<ListingFormDraft>) => void;
  error?: string | null;
}

const RECAPTCHA_CONTAINER_ID = 'pawfect-listing-otp-recaptcha';

export const StepContactOtp: React.FC<StepContactOtpProps> = ({
  draft,
  onChange,
  error,
}) => {
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const normalizedInput = normalizeIndianMobile(draft.phone || '');
  const isPhoneCurrentlyVerified =
    Boolean(draft.phoneVerifiedForNumber) &&
    draft.phoneVerifiedForNumber === normalizedInput &&
    isValidIndianMobile(normalizedInput);

  const handleSendOtp = async () => {
    setOtpError(null);
    setOtpNotice(null);

    if (!isValidIndianMobile(draft.phone)) {
      setOtpError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    setSendingOtp(true);
    try {
      const result = await phoneOtpService.sendOtp(draft.phone, RECAPTCHA_CONTAINER_ID);
      setConfirmation(result.confirmationResult);
      onChange({ phone: result.normalizedPhone });
      setOtpNotice(`A 6-digit verification code was sent to ${result.normalizedPhone}.`);
    } catch (err: any) {
      setOtpError(err?.message || 'Could not send OTP verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmation) return;
    setOtpError(null);
    setVerifyingOtp(true);

    try {
      await phoneOtpService.confirmOtp(confirmation, otpCode);
      onChange({
        phone: normalizedInput,
        phoneVerifiedForNumber: normalizedInput,
      });
      setConfirmation(null);
      setOtpCode('');
      setOtpNotice('Mobile number verified.');
    } catch (err: any) {
      setOtpError(err?.message || 'Invalid verification code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#F6F0EC]">
          Contact &amp; Phone Verification
        </h2>
        <p className="mt-1 text-sm text-[#B8A8AE]">
          Verify your Indian mobile number with an OTP. Your phone number stays completely hidden from the public and is revealed only to adopters you accept.
        </p>
      </div>

      {/* Privacy Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#382D32] bg-[#161114] p-4 text-xs text-[#CBBBC2]">
        <Lock className="h-4 w-4 text-[#E2B75B] shrink-0 mt-0.5" />
        <span>
          Zero-exposure privacy: Phone numbers are stored in a locked private subdocument and never included on public listing pages.
        </span>
      </div>

      <div>
        <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-1.5">
          Contact Person Name *
        </label>
        <input
          id="contact-name"
          type="text"
          maxLength={80}
          value={draft.contactName}
          onChange={(e) => onChange({ contactName: e.target.value })}
          placeholder="Your name or shelter coordinator name"
          className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-4 py-3 text-sm text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none"
        />
      </div>

      {/* Indian Mobile + Send OTP */}
      <div>
        <label htmlFor="contact-phone" className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-1.5">
          10-Digit Indian Mobile Number *
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8D7D83]" />
            <input
              id="contact-phone"
              type="tel"
              value={draft.phone}
              onChange={(e) =>
                onChange({
                  phone: e.target.value,
                })
              }
              placeholder="9876543210 or +919876543210"
              className="w-full rounded-xl border border-[#382D32] bg-[#161114] py-3 pl-10 pr-4 text-sm text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none"
            />
          </div>

          {!isPhoneCurrentlyVerified && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#7B1E3A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#932547] disabled:opacity-50"
            >
              {sendingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...
                </>
              ) : confirmation ? (
                'Resend OTP'
              ) : (
                'Send OTP'
              )}
            </button>
          )}
        </div>

        {/* Verified Pill */}
        {isPhoneCurrentlyVerified && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Verified via OTP ({normalizedInput})
          </div>
        )}
      </div>

      {/* OTP Code Box */}
      {confirmation && !isPhoneCurrentlyVerified && (
        <div className="rounded-2xl border border-[#4C3B42] bg-[#1D1619] p-4 space-y-3">
          <label htmlFor="otp-code-input" className="block text-xs font-semibold text-[#F6F0EC]">
            Enter 6-Digit OTP Code
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="otp-code-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              className="flex-1 rounded-xl border border-[#382D32] bg-[#110E10] px-4 py-2.5 text-sm font-mono tracking-widest text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={verifyingOtp || otpCode.length !== 6}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {verifyingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Verify OTP
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Invisible reCAPTCHA mount point */}
      <div id={RECAPTCHA_CONTAINER_ID} />

      {/* Reveal Preference */}
      <label className="flex items-start gap-3 rounded-2xl border border-[#382D32] bg-[#161114] p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.revealOnlyToApproved}
          onChange={(e) => onChange({ revealOnlyToApproved: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-[#382D32] text-[#D94F73]"
        />
        <div>
          <div className="text-sm font-semibold text-[#F6F0EC]">
            Reveal to approved adopters only
          </div>
          <p className="mt-0.5 text-xs text-[#B8A8AE]">
            Recommended. Your mobile number remains masked on the public listing and unlocks only when you accept an adopter&apos;s inquiry.
          </p>
        </div>
      </label>

      {otpNotice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-200">
          {otpNotice}
        </div>
      )}

      {(otpError || error) && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
          {otpError || error}
        </div>
      )}
    </div>
  );
};
