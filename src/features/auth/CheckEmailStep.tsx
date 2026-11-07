import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, RotateCw, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '../../ui/components/Button.js';
import { emailVerificationService } from '../../app/container.js';

export interface CheckEmailStepProps {
  email: string;
  onBackToLogin: () => void;
  onForgotPassword: (email: string) => void;
}

export const CheckEmailStep: React.FC<CheckEmailStepProps> = ({
  email,
  onBackToLogin,
  onForgotPassword,
}) => {
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setFeedback(null);

    try {
      const res = await emailVerificationService.resendVerificationEmail(email);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setCooldown(60);
      } else {
        setFeedback({ type: 'error', message: res.message });
        if (res.cooldownRemainingSeconds) {
          setCooldown(res.cooldownRemainingSeconds);
        }
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Could not send verification email right now. Please try again later.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3E3E8] text-[#7B1E3A]">
        <Mail className="h-8 w-8" aria-hidden="true" />
      </div>

      <div>
        <h2 className="font-heading text-2xl font-medium text-[#231A1D]">
          Check your email
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6B5B61]">
          We sent a confirmation link to{' '}
          <span className="font-semibold text-[#231A1D]">{email}</span>.
          Click the link in that email to activate your Pawfect donor account.
        </p>
      </div>

      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`rounded-xl border p-4 text-xs text-left flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'border-[#2E7D5B]/30 bg-[#2E7D5B]/10 text-[#2E7D5B]'
              : 'border-[#B4423A]/30 bg-[#B4423A]/10 text-[#B4423A]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <Mail className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed">{feedback.message}</div>
        </div>
      )}

      <div className="rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] p-4 text-xs text-[#6B5B61] text-left leading-relaxed">
        <p className="font-semibold text-[#231A1D]">Can't find the email?</p>
        <p className="mt-1">
          Check your Spam, Junk, or Promotions folder. It usually arrives within 1-2 minutes.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          isLoading={isResending}
          className="w-full gap-2"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          <span>
            {cooldown > 0
              ? `Resend email in ${cooldown}s`
              : 'Resend verification email'}
          </span>
        </Button>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onBackToLogin}
          className="w-full gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Return to Log in</span>
        </Button>
      </div>

      <div className="pt-2 border-t border-[#E7DEDF]">
        <button
          type="button"
          onClick={() => onForgotPassword(email)}
          className="text-xs font-medium text-[#7B1E3A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded px-2 min-h-[36px] inline-flex items-center gap-1.5"
        >
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Need to replace password or claim this account?</span>
        </button>
      </div>
    </div>
  );
};
