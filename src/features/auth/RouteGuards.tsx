import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth as useCentralAuth } from '../../context/AuthContext.js';
import { ROUTES } from '../../config/constants.js';
import { sanitizeRedirectPath } from '../../security/validation.js';

interface GuardProps {
  children: React.ReactNode;
}

/**
 * Loading Spinner Component
 * Single, stable, flicker-free session verification indicator.
 */
export const SessionLoader: React.FC<{ message?: string }> = ({
  message = 'Verifying session...',
}) => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
      <p className="text-xs font-medium text-[#6B5B61]">{message}</p>
    </div>
  </div>
);

/**
 * RequireAuth Guard
 * Ensures only authenticated users with verified emails can access protected routes.
 * Stays in single loading state until both auth and user profile have resolved.
 */
export const RequireAuth: React.FC<GuardProps> = ({ children }) => {
  const { user, loading } = useCentralAuth();
  const location = useLocation();

  if (loading) {
    return <SessionLoader message="Verifying session..." />;
  }

  // Not signed in or email unverified
  if (!user || !user.emailVerified) {
    console.log(
      `[RouteGuard] RequireAuth: Access denied for ${location.pathname}. Redirecting to auth.`
    );
    const nextParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.AUTH}?next=${nextParam}`} replace />;
  }

  return <>{children}</>;
};

/**
 * RedirectIfAuthenticated Guard
 * Sends logged-in, email-verified users away from /auth to /dashboard or next destination.
 */
export const RedirectIfAuthenticated: React.FC<GuardProps> = ({ children }) => {
  const { user, loading } = useCentralAuth();
  const location = useLocation();

  if (loading) {
    return <SessionLoader message="Checking authentication..." />;
  }

  if (user && user.emailVerified) {
    const searchParams = new URLSearchParams(location.search);
    const next = sanitizeRedirectPath(searchParams.get('next'));
    console.log(
      `[RouteGuard] RedirectIfAuthenticated: User ${user.uid} is verified. Redirecting to ${next}.`
    );
    return <Navigate to={next} replace />;
  }

  return <>{children}</>;
};

/**
 * useAuth Hook
 * Compatibility bridge exposing both modern AuthContext shape and legacy { currentUser }
 */
export function useAuth() {
  const auth = useCentralAuth();
  return {
    ...auth,
    currentUser: auth.user,
  };
}
