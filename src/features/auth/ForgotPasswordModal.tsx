import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { emailSchema } from '../../security/validation.js';
import { passwordResetService } from '../../app/container.js';
import { Input } from '../../ui/components/Input.js';
import { Button } from '../../ui/components/Button.js';
import { X, KeyRound, CheckCircle2 } from 'lucide-react';

const forgotSchema = z.object({
  email: emailSchema,
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  initialEmail = '',
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: initialEmail,
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (values: ForgotFormValues) => {
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      const res = await passwordResetService.requestPasswordReset(values.email);
      setSuccessMessage(res.message);
    } catch {
      setSuccessMessage(
        'If that email has an account, we have sent a reset link. Please check your inbox and spam folder.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231A1D]/60 backdrop-blur-xs transition-opacity"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E7DEDF] bg-white p-6 shadow-xl text-left sm:p-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-[#6B5B61] hover:bg-[#FAF7F2] hover:text-[#231A1D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3E3E8] text-[#7B1E3A]">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="forgot-password-title"
              className="font-heading text-xl font-medium text-[#231A1D]"
            >
              Reset your password
            </h3>
            <p className="text-xs text-[#6B5B61]">
              Enter your email to receive a secure recovery link.
            </p>
          </div>
        </div>

        {successMessage ? (
          <div className="space-y-5">
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-[#2E7D5B]/30 bg-[#2E7D5B]/10 p-4 text-xs text-[#2E7D5B] flex items-start gap-3"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">
                {successMessage}
              </div>
            </div>

            <p className="text-xs text-[#6B5B61] leading-relaxed">
              If an account is associated with this email, the reset link will clear any active daily lockouts upon completion.
            </p>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onClose}
              className="w-full"
            >
              Return to login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Account email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
              >
                Send reset link
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
