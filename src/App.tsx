/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage.js';
import { AuthPage } from './features/auth/AuthPage.js';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage.js';
import { DashboardPage } from './features/dashboard/DashboardPage.js';
import {
  RequireAuth,
  RedirectIfAuthenticated,
} from './features/auth/RouteGuards.js';
import { ROUTES } from './config/constants.js';
import { validateFirestoreConnection } from './config/firebase.js';

export default function App() {
  useEffect(() => {
    // Validate Firestore connection on boot per Firebase skill mandate
    validateFirestoreConnection().catch((err) => {
      console.warn('Firestore initial boot check:', err);
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path={ROUTES.HOME} element={<LandingPage />} />

        {/* Combined Auth Portal (Email -> Password / Signup) */}
        <Route
          path={ROUTES.AUTH}
          element={
            <RedirectIfAuthenticated>
              <AuthPage />
            </RedirectIfAuthenticated>
          }
        />

        {/* Dedicated Password Reset Action Handler */}
        <Route path={ROUTES.RESET} element={<ResetPasswordPage />} />

        {/* Protected Dashboard Route */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        {/* Fallback to Home */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
