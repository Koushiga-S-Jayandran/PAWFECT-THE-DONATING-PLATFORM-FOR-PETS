import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authGateway } from '../../app/container.js';
import type { AuthSessionUser } from '../../domain/entities.js';
import { ROUTES } from '../../config/constants.js';
import { sanitizeRedirectPath } from '../../security/validation.js';

interface GuardProps {
  children: React.ReactNode;
}

/**
 * RequireAuth Guard
 * Ensures only authenticated users with verified emails can access protected pages like /dashboard.
 */
export const RequireAuth: React.FC<GuardProps> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authGateway.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Waiting for initial auth resolution
  if (user === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
          <p className="text-xs font-medium text-[#6B5B61]">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Not signed in or email unverified
  if (!user || !user.emailVerified) {
    const nextParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.AUTH}?next=${nextParam}`} replace />;
  }

  return <>{children}</>;
};

/**
 * RedirectIfAuthenticated Guard
 * Sends logged-in, email-verified users away from /auth to /dashboard or the sanitized next destination.
 */
export const RedirectIfAuthenticated: React.FC<GuardProps> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authGateway.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
      </div>
    );
  }

  if (user && user.emailVerified) {
    const searchParams = new URLSearchParams(location.search);
    const next = sanitizeRedirectPath(searchParams.get('next'));
    return <Navigate to={next} replace />;
  }

  return <>{children}</>;
};

/**
 * useAuth Hook
 * Subscribes to auth session user state.
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(
    authGateway.getCurrentUser()
  );

  useEffect(() => {
    const unsubscribe = authGateway.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  return { currentUser };
}

