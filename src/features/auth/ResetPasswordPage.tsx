import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '../../security/validation.js';
import { validatePasswordStrength } from '../../security/passwordRules.js';
import { passwordResetService } from '../../app/container.js';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Input } from '../../ui/components/Input.js';
import { Button } from '../../ui/components/Button.js';
import { ROUTES } from '../../config/constants.js';
import { KeyRound, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Store oobCode in memory and scrub from URL bar immediately to prevent Referer leakage
  const [oobCode, setOobCode] = useState<string | null>(null);
  const codeCaptured = useRef(false);

  useEffect(() => {
    if (codeCaptured.current) return;
    const code = searchParams.get('oobCode');
    if (code) {
      setOobCode(code);
      codeCaptured.current = true;
      // Strip oobCode and apiKey from URL bar using replaceState
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [searchParams]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    email?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = watch('password') || '';
  const strength = validatePasswordStrength(watchedPassword);

  const onSubmit = async (values: ResetPasswordFormData) => {
    if (!oobCode) {
      setErrorMessage(
        'Missing password reset security code. Please click the reset link in your email again.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await passwordResetService.completePasswordReset(
        oobCode,
        values.password
      );

      if (result.success) {
        setSuccessInfo({
          message: result.message,
          email: result.email,
        });
        // Redirect to dashboard after brief confirmation
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }, 1800);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Failed to update password. The link may have expired or already been used.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card padding="md" className="shadow-sm text-left">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E3E8] text-[#7B1E3A]">
                <KeyRound className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-medium text-[#231A1D]">
                  Set new password
                </h1>
                <p className="text-xs text-[#6B5B61]">
                  Choose a strong, secure password for your Pawfect account.
                </p>
              </div>
            </div>

            {successInfo ? (
              <div className="space-y-4" role="status">
                <div className="rounded-xl border border-[#2E7D5B]/30 bg-[#2E7D5B]/10 p-4 text-xs text-[#2E7D5B] flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">
                      {successInfo.message}
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Your daily login attempts have been reset. Redirecting to your dashboard...
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] p-4 text-xs text-[#6B5B61] leading-relaxed">
                  <div className="flex items-center gap-2 font-semibold text-[#231A1D]">
                    <Lock className="h-4 w-4 text-[#7B1E3A]" />
                    <span>Account Security Tip</span>
                  </div>
                  <p className="mt-1">
                    If you suspect unauthorized access, please log out of other devices from your account settings.
                  </p>
                </div>
              </div>
            ) : !oobCode ? (
              <div className="space-y-4">
                <div
                  role="alert"
                  className="rounded-xl border border-[#B7791F]/30 bg-[#B7791F]/10 p-4 text-xs text-[#915f16] flex items-start gap-3"
                >
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-semibold text-sm">Reset link required</p>
                    <p className="mt-1">
                      No security token found in this request. Please click the reset link directly from your email inbox.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="md"
                  variant="primary"
                  onClick={() => navigate(ROUTES.AUTH)}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {errorMessage && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl border border-[#B4423A]/20 bg-[#B4423A]/10 p-3.5 text-xs text-[#B4423A]"
                  >
                    {errorMessage}
                  </div>
                )}

                <div>
                  <Input
                    label="New password"
                    isPassword
                    autoComplete="new-password"
                    placeholder="Minimum 10 characters"
                    error={errors.password?.message}
                    {...register('password')}
                  />

                  {watchedPassword.length > 0 && (
                    <div className="mt-2 space-y-1" aria-live="polite">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6B5B61]">Strength:</span>
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
                  label="Confirm new password"
                  isPassword
                  autoComplete="new-password"
                  placeholder="Re-type your new password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="w-full mt-2"
                >
                  Update password & Sign in
                </Button>
              </form>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};
