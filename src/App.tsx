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
import { ShelterRegisterPage } from './features/shelter/ShelterRegisterPage.js';
import { ShelterStatusPage } from './features/shelter/ShelterStatusPage.js';
import { ShelterBrowsePage } from './features/shelter/ShelterBrowsePage.js';
import { ShelterDetailPage } from './features/shelter/ShelterDetailPage.js';
import { AdminSheltersPage } from './features/admin/AdminSheltersPage.js';
import { SHELTER_ROUTES } from './config/shelterRoutes.js';
import { GiftPickerPage } from './features/donation/GiftPickerPage.js';
import { GiftDetailsPage } from './features/donation/GiftDetailsPage.js';
import { DonationReviewPage } from './features/donation/DonationReviewPage.js';
import { DonationPayPage } from './features/donation/DonationPayPage.js';
import { DonationStatusPage } from './features/donation/DonationStatusPage.js';
import { MyDonationsPage } from './features/donation/MyDonationsPage.js';
import { DONATION_ROUTES } from './config/donationRoutes.js';
import { DonorProofPage } from './features/donor/DonorProofPage.js';
import { PROOF_ROUTES } from './config/proofRoutes.js';

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


        {/* Shelter Routes (Step 1) */}
        <Route
          path={SHELTER_ROUTES.REGISTER}
          element={
            <RequireAuth>
              <ShelterRegisterPage />
            </RequireAuth>
          }
        />
        <Route
          path={SHELTER_ROUTES.STATUS}
          element={
            <RequireAuth>
              <ShelterStatusPage />
            </RequireAuth>
          }
        />
        <Route
          path={SHELTER_ROUTES.BROWSE}
          element={
            <RequireAuth>
              <ShelterBrowsePage />
            </RequireAuth>
          }
        />
        <Route
          path={SHELTER_ROUTES.DETAIL}
          element={
            <RequireAuth>
              <ShelterDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path={SHELTER_ROUTES.ADMIN_SHELTERS}
          element={
            <RequireAuth>
              <AdminSheltersPage />
            </RequireAuth>
          }
        />

        {/* Donation & Gift Giving Routes (Step 2) */}
        <Route path={DONATION_ROUTES.CATALOG} element={<GiftPickerPage />} />
        <Route
          path={DONATION_ROUTES.DETAILS}
          element={
            <RequireAuth>
              <GiftDetailsPage />
            </RequireAuth>
          }
        />
        <Route
          path={DONATION_ROUTES.REVIEW}
          element={
            <RequireAuth>
              <DonationReviewPage />
            </RequireAuth>
          }
        />
        <Route
          path={DONATION_ROUTES.PAY}
          element={
            <RequireAuth>
              <DonationPayPage />
            </RequireAuth>
          }
        />
        <Route
          path={DONATION_ROUTES.STATUS}
          element={
            <RequireAuth>
              <DonationStatusPage />
            </RequireAuth>
          }
        />
        <Route
          path={DONATION_ROUTES.MY_DONATIONS}
          element={
            <RequireAuth>
              <MyDonationsPage />
            </RequireAuth>
          }
        />
        <Route
          path={PROOF_ROUTES.DONOR_PROOF}
          element={
            <RequireAuth>
              <DonorProofPage />
            </RequireAuth>
          }
        />

        {/* Fallback to Home */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
