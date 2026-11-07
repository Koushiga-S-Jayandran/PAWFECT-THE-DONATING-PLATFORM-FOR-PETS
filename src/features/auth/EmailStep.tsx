import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { emailSchema } from '../../security/validation.js';
import { authGateway, throttleService } from '../../app/container.js';
import { Input } from '../../ui/components/Input.js';
import { Button } from '../../ui/components/Button.js';
import { ArrowRight, Lock } from 'lucide-react';

const formSchema = z.object({
  email: emailSchema,
});

type FormValues = z.infer<typeof formSchema>;

export interface EmailStepProps {
  initialEmail?: string;
  onRegistered: (email: string) => void;
  onUnregistered: (email: string) => void;
}

export const EmailStep: React.FC<EmailStepProps> = ({
  initialEmail = '',
  onRegistered,
  onUnregistered,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [lockedInfo, setLockedInfo] = useState<{
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: initialEmail,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setGeneralError(null);
    setLockedInfo(null);

    const email = values.email;

    try {
      // 1. Check if this email is already locked out by the 3-try rule
      const throttleCheck = await throttleService.checkPreAttemptLock(email);
      if (throttleCheck.isLocked) {
        setLockedInfo({
          message:
            throttleCheck.message ||
            'Too many tries today. Reset your password by email or try again later.',
        });
        setIsLoading(false);
        return;
      }

      // 2. Lookup sign-in methods
      const methods = await authGateway.fetchSignInMethods(email);

      // If registered (methods array has 'password')
      if (methods && methods.length > 0) {
        onRegistered(email);
      } else {
        // Not registered (or enumeration protection is active, fallback safely to create flow)
        onUnregistered(email);
      }
    } catch (err: any) {
      console.warn('Lookup error:', err);
      // Friendly fallback
      onUnregistered(email);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-heading text-2xl font-medium text-[#231A1D]">
          Welcome to Pawfect
        </h2>
        <p className="mt-1.5 text-sm text-[#6B5B61]">
          Enter your email to sign in or create your donor account.
        </p>
      </div>

      {lockedInfo && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-[#B4423A]/30 bg-[#B4423A]/10 p-4 text-xs text-[#B4423A] flex items-start gap-3"
        >
          <Lock className="h-5 w-5 shrink-0 text-[#B4423A] mt-0.5" />
          <div>
            <p className="font-semibold">Account Temporarily Locked</p>
            <p className="mt-0.5 leading-relaxed">{lockedInfo.message}</p>
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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Input
          label="Email address"
          type="email"
          autoComplete="username email"
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          size="lg"
          isLoading={isLoading}
          className="w-full gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="text-center text-xs text-[#6B5B61]">
        Shelter animal giving is powered by direct UPI with verified proof.
      </p>
    </div>
  );
};
