import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { EmailStep } from './EmailStep.js';
import { PasswordStep } from './PasswordStep.js';
import { SignupStep } from './SignupStep.js';
import { CheckEmailStep } from './CheckEmailStep.js';
import { ForgotPasswordModal } from './ForgotPasswordModal.js';
import { sanitizeRedirectPath } from '../../security/validation.js';
import { ROUTES } from '../../config/constants.js';

type AuthStep = 'email' | 'password' | 'signup' | 'check_email';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const nextDestination = sanitizeRedirectPath(searchParams.get('next'));

  const [step, setStep] = useState<AuthStep>('email');
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleLoginSuccess = () => {
    navigate(nextDestination, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Brand Mark Accent */}
          <div className="mb-6 flex justify-center">
            <img
              src="/assets/aistudio/pawfect_logo_transparent_9c2be9aa.png"
              alt="Pawfect"
              className="h-14 w-auto object-contain"
            />
          </div>

          <Card padding="md" className="shadow-sm">
            {step === 'email' && (
              <EmailStep
                initialEmail={currentEmail}
                onRegistered={(email) => {
                  setCurrentEmail(email);
                  setStep('password');
                }}
                onUnregistered={(email) => {
                  setCurrentEmail(email);
                  setStep('signup');
                }}
              />
            )}

            {step === 'password' && (
              <PasswordStep
                email={currentEmail}
                onSuccess={handleLoginSuccess}
                onBack={() => setStep('email')}
                onForgotPassword={() => setIsForgotModalOpen(true)}
                onGoToSignup={(email) => {
                  setCurrentEmail(email);
                  setStep('signup');
                }}
                onUnverifiedEmail={(email) => {
                  setCurrentEmail(email);
                  setStep('check_email');
                }}
              />
            )}

            {step === 'signup' && (
              <SignupStep
                initialEmail={currentEmail}
                onSuccess={(email) => {
                  setCurrentEmail(email);
                  setStep('check_email');
                }}
                onBack={() => setStep('email')}
                onGoToLogin={(email) => {
                  setCurrentEmail(email);
                  setStep('password');
                }}
                onForgotPassword={(email) => {
                  setCurrentEmail(email);
                  setIsForgotModalOpen(true);
                }}
                onResendVerification={(email) => {
                  setCurrentEmail(email);
                  setStep('check_email');
                }}
              />
            )}

            {step === 'check_email' && (
              <CheckEmailStep
                email={currentEmail}
                onBackToLogin={() => setStep('password')}
                onForgotPassword={(email) => {
                  setCurrentEmail(email);
                  setIsForgotModalOpen(true);
                }}
              />
            )}
          </Card>

          <ForgotPasswordModal
            isOpen={isForgotModalOpen}
            initialEmail={currentEmail}
            onClose={() => setIsForgotModalOpen(false)}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};
