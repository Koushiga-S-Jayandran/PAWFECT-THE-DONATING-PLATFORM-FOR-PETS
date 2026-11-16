import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { shelterReader } from '../../app/container.js';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { ROUTES } from '../../config/constants.js';
import { SHELTER_ROUTES } from '../../config/shelterRoutes.js';
import { DONATION_ROUTES } from '../../config/donationRoutes.js';
import { useAuth } from '../../context/AuthContext.js';
import './dashboard.css';

export const DashboardPage: React.FC = () => {
  const { user, profile, loading: isLoadingProfile, logout } = useAuth();
  const [hasShelter, setHasShelter] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.uid) {
      shelterReader
        .getShelterById(user.uid)
        .then((shelter) => {
          if (shelter) {
            setHasShelter(true);
          }
        })
        .catch(() => {
          // Keep resilient state without unneeded telemetry
        });
    }
  }, [user?.uid]);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.AUTH, { replace: true });
  };

  // Extract first name as text
  const fullNameString = profile?.fullName || profile?.name || user?.displayName || '';
  const firstName = fullNameString.trim().split(' ')[0] || (user?.email ? user.email.split('@')[0] : 'there');

  return (
    <div className="pf-dash-wrapper">
      <Header />

      <main className="pf-dash-main">
        {/* Welcome Section */}
        <header className="pf-dash-header">
          <div className="pf-dash-header-row">
            <div className="pf-dash-welcome-group">
              <div className="pf-dash-badges-row">
                {user?.emailVerified && (
                  <span className="pf-dash-badge pf-dash-badge-verified">
                    Email verified
                  </span>
                )}
                {profile?.role && (
                  <span className="pf-dash-badge pf-dash-badge-role">
                    {profile.role}
                  </span>
                )}
              </div>

              <h1 className="pf-dash-title">
                {isLoadingProfile ? 'Welcome back' : `Welcome, ${firstName}`}
              </h1>

              {user?.email && (
                <p className="pf-dash-subtitle">{user.email}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="pf-dash-logout-btn"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Navigation Cards Grid: 1 col (360px), 2 col (tablet), 3 col (desktop) */}
        <section aria-label="Dashboard destinations">
          <div className="pf-dash-grid">
            {/* Card 1: Choose a gift */}
            <Link
              to={DONATION_ROUTES.CATALOG}
              className="pf-dash-card"
            >
              <div className="pf-dash-card-content">
                <h2 className="pf-dash-card-title">Choose a gift</h2>
                <p className="pf-dash-card-desc">
                  Browse meal packs, medical care, and essentials for shelter animals.
                </p>
              </div>
              <div className="pf-dash-card-footer">
                <span className="pf-dash-card-action">
                  Open <span className="pf-dash-card-action-arrow" aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            {/* Card 2: My gifts */}
            <Link
              to={DONATION_ROUTES.MY_DONATIONS}
              className="pf-dash-card"
            >
              <div className="pf-dash-card-content">
                <h2 className="pf-dash-card-title">My gifts</h2>
                <p className="pf-dash-card-desc">
                  View your donation history, payment proofs, and contribution receipts.
                </p>
              </div>
              <div className="pf-dash-card-footer">
                <span className="pf-dash-card-action">
                  Open <span className="pf-dash-card-action-arrow" aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            {/* Card 3: Browse shelters */}
            <Link
              to={SHELTER_ROUTES.BROWSE}
              className="pf-dash-card"
            >
              <div className="pf-dash-card-content">
                <h2 className="pf-dash-card-title">Browse shelters</h2>
                <p className="pf-dash-card-desc">
                  Discover verified animal rescue shelters and sanctuaries across India.
                </p>
              </div>
              <div className="pf-dash-card-footer">
                <span className="pf-dash-card-action">
                  Open <span className="pf-dash-card-action-arrow" aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            {/* Card 4: Shelter status / registration depending on hasShelter */}
            <Link
              to={hasShelter ? SHELTER_ROUTES.STATUS : SHELTER_ROUTES.REGISTER}
              className="pf-dash-card"
            >
              <div className="pf-dash-card-content">
                <h2 className="pf-dash-card-title">
                  {hasShelter ? 'My shelter status' : 'Register your shelter'}
                </h2>
                <p className="pf-dash-card-desc">
                  {hasShelter
                    ? 'Check your registered shelter verification status and profile details.'
                    : 'Enroll an animal shelter to receive direct public donations and support.'}
                </p>
              </div>
              <div className="pf-dash-card-footer">
                <span className="pf-dash-card-action">
                  Open <span className="pf-dash-card-action-arrow" aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
