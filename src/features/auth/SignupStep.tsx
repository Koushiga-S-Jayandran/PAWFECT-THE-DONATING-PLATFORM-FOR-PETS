import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  signupSchema,
  type SignupFormData,
} from '../../security/validation.js';
import { validatePasswordStrength } from '../../security/passwordRules.js';
import { signupService } from '../../app/container.js';
import { Input } from '../../ui/components/Input.js';
import { Button } from '../../ui/components/Button.js';
import { ArrowLeft, Info, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface SignupStepProps {
  initialEmail: string;
  onSuccess: (email: string) => void;
  onBack: () => void;
  onGoToLogin: (email: string) => void;
  onForgotPassword: (email: string) => void;
  onResendVerification: (email: string) => void;
}

export const SignupStep: React.FC<SignupStepProps> = ({
  initialEmail,
  onSuccess,
  onBack,
  onGoToLogin,
  onForgotPassword,
  onResendVerification,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [existingUnverifiedAlert, setExistingUnverifiedAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: initialEmail,
      phone: '+91',
      password: '',
      confirmPassword: '',
      consent: false,
    },
  });

  const watchedPassword = watch('password') || '';
  const watchedEmail = watch('email') || initialEmail;
  const strength = validatePasswordStrength(watchedPassword, watchedEmail);

  const onSubmit = async (values: SignupFormData) => {
    setIsLoading(true);
    setGeneralError(null);
    setExistingUnverifiedAlert(null);

    try {
      const result = await signupService.registerUser(values);

      if (result.isExistingUnverified) {
        setExistingUnverifiedAlert(values.email);
        return;
      }

      if (result.success) {
        onSuccess(values.email);
        return;
      }

      setGeneralError(result.message || 'Unable to register account.');
    } catch (err: any) {
      setGeneralError(err?.message || 'Registration failed. Please verify your details.');
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
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={() => onGoToLogin(initialEmail)}
          className="text-xs font-semibold text-[#7B1E3A] hover:text-[#5E1730] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded px-2 min-h-[36px]"
        >
          Already have an account? Sign in
        </button>
      </div>

      {/* Banner when email wasn't found */}
      <div
        role="region"
        aria-label="Account creation notice"
        className="rounded-xl border border-[#7B1E3A]/20 bg-[#F3E3E8]/50 p-4 text-xs text-[#7B1E3A] flex items-start gap-3"
      >
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">We couldn't find an account with this email.</span> Let's create one for you.
        </div>
      </div>

      {/* Pre-hijacking mitigation banner */}
      {existingUnverifiedAlert && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-[#B7791F]/30 bg-[#B7791F]/10 p-5 text-xs text-[#915f16] space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#B7791F] mt-0.5" />
            <div>
              <p className="font-semibold text-sm">This email is waiting to be confirmed</p>
              <p className="mt-1 leading-relaxed">
                An account with this email exists but is pending confirmation. If someone else attempted to sign up with your email, resetting your password securely replaces any unknown password and grants you verified ownership.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#B7791F]/20">
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => onForgotPassword(existingUnverifiedAlert)}
            >
              Reset password to claim ownership
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onResendVerification(existingUnverifiedAlert)}
            >
              Resend verification email
            </Button>
          </div>
        </div>
      )}

      {generalError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-[#B4423A]/20 bg-[#B4423A]/10 p-3.5 text-xs text-[#B4423A]"
        >
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="e.g. Ananya Sharma"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Email address"
          type="email"
          autoComplete="username email"
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Mobile number (+91)"
          type="tel"
          autoComplete="tel"
          placeholder="+919876543210"
          helperText="10-digit Indian mobile number for direct shelter transaction notifications"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div>
          <Input
            label="Password"
            isPassword
            autoComplete="new-password"
            placeholder="Minimum 10 characters"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Password strength meter */}
          {watchedPassword.length > 0 && (
            <div className="mt-2 space-y-1.5" aria-live="polite">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B5B61]">Password strength:</span>
                <span
                  className={`font-semibold ${
                    strength.score <= 1
                      ? 'text-[#B4423A]'
                      : strength.score === 2
                      ? 'text-[#B7791F]'
                      : 'text-[#2E7D5B]'
                  }`}
                >
                  {strength.strengthLabel}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E7DEDF]">
                <div
                  className={`h-full transition-all duration-200 ${
                    strength.score <= 1
                      ? 'w-1/4 bg-[#B4423A]'
                      : strength.score === 2
                      ? 'w-2/4 bg-[#B7791F]'
                      : strength.score === 3
                      ? 'w-3/4 bg-[#C9A24B]'
                      : 'w-full bg-[#2E7D5B]'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        <Input
          label="Confirm password"
          isPassword
          autoComplete="new-password"
          placeholder="Re-type your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {/* Consent Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-[#E7DEDF] text-[#7B1E3A] focus:ring-[#7B1E3A]"
              {...register('consent')}
            />
            <span className="text-xs leading-relaxed text-[#6B5B61]">
              I agree to the Pawfect Terms of Service and Privacy Policy. I understand that all gifts go directly to shelter UPI handles and are non-refundable.
            </span>
          </label>
          {errors.consent?.message && (
            <p className="mt-1 text-xs font-medium text-[#B4423A]" role="alert">
              {errors.consent.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full gap-2 mt-4"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>Create donor account</span>
        </Button>
      </form>
    </div>
  );
};
