import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginService } from '../../app/container.js';
import { Input } from '../../ui/components/Input.js';
import { Button } from '../../ui/components/Button.js';
import { ArrowLeft, Lock, AlertCircle } from 'lucide-react';

const passwordFormSchema = z.object({
  password: z.string().min(1, 'Please enter your password'),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export interface PasswordStepProps {
  email: string;
  onSuccess: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
  onGoToSignup: (email: string) => void;
  onUnverifiedEmail: (email: string) => void;
}

export const PasswordStep: React.FC<PasswordStepProps> = ({
  email,
  onSuccess,
  onBack,
  onForgotPassword,
  onGoToSignup,
  onUnverifiedEmail,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingTries, setRemainingTries] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockTimeFormatted, setUnlockTimeFormatted] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginService.authenticate(email, values.password);

      if (result.status === 'SUCCESS') {
        onSuccess();
        return;
      }

      if (result.status === 'UNVERIFIED_EMAIL') {
        onUnverifiedEmail(email);
        return;
      }

      if (result.status === 'LOCKED') {
        setIsLocked(true);
        setUnlockTimeFormatted(result.unlockTimeFormatted || null);
        setErrorMessage(result.message);
        return;
      }

      if (result.status === 'WRONG_PASSWORD') {
        if (result.remainingTries !== undefined) {
          setRemainingTries(result.remainingTries);
        }
        if (result.remainingTries === 0) {
          setIsLocked(true);
          setUnlockTimeFormatted(result.unlockTimeFormatted || null);
        }
        setErrorMessage(result.message);
        return;
      }

      setErrorMessage(result.message || 'Unable to sign in.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#6B5B61] hover:text-[#231A1D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded-lg px-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Change email</span>
        </button>

        <span className="text-xs text-[#6B5B61] max-w-[200px] truncate font-medium">
          {email}
        </span>
      </div>

      <div>
        <h2 className="font-heading text-2xl font-medium text-[#231A1D]">
          Enter your password
        </h2>
        <p className="mt-1 text-sm text-[#6B5B61]">
          Sign in to access your Pawfect donor account.
        </p>
      </div>

      {isLocked ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-[#B4423A]/30 bg-[#B4423A]/10 p-5 text-sm text-[#B4423A] space-y-3"
        >
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 shrink-0 text-[#B4423A] mt-0.5" />
            <div>
              <p className="font-semibold text-base">Account Locked</p>
              <p className="mt-1 text-xs leading-relaxed">
                {errorMessage ||
                  `Too many tries today. You can try again at ${unlockTimeFormatted || 'tomorrow'}, or reset your password by email now.`}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#B4423A]/20 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onForgotPassword}
              className="bg-[#B4423A] hover:bg-[#8f322b]"
            >
              Reset password now
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
            >
              Try different email
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-[#B4423A]/20 bg-[#B4423A]/10 p-3.5 text-xs text-[#B4423A] flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div className="space-y-1.5">
            <Input
              label="Password"
              isPassword
              autoComplete="current-password"
              placeholder="••••••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-between pt-1">
              {remainingTries !== null && remainingTries > 0 ? (
                <span className="text-xs text-[#B7791F] font-medium">
                  {remainingTries} {remainingTries === 1 ? 'attempt' : 'attempts'} remaining today
                </span>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs font-semibold text-[#7B1E3A] hover:text-[#5E1730] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded px-1 min-h-[36px] inline-flex items-center"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full"
          >
            Log in
          </Button>

          <div className="pt-3 text-center border-t border-[#E7DEDF]/70">
            <span className="text-xs text-[#6B5B61]">New here? </span>
            <button
              type="button"
              onClick={() => onGoToSignup(email)}
              className="text-xs font-semibold text-[#7B1E3A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded px-1"
            >
              Create an account
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
