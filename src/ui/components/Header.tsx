import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authGateway } from '../../app/container.js';
import type { AuthSessionUser } from '../../domain/entities.js';
import { ROUTES } from '../../config/constants.js';

export const Header: React.FC = () => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = authGateway.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authGateway.signOut();
    navigate(ROUTES.AUTH);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E7DEDF] bg-[#FFFFFF]/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo - used as-is from asset */}
        <Link
          to={ROUTES.HOME}
          className="group flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
          aria-label="Pawfect Home"
        >
          <img
            src="/assets/aistudio/pawfect_logo_transparent_9c2be9aa.png"
            alt="Pawfect Logo"
            className="h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
          />
        </Link>

        {/* Navigation Action */}
        <nav className="flex items-center gap-4">
          {user && user.emailVerified ? (
            <div className="flex items-center gap-3">
              <Link
                to={ROUTES.DASHBOARD}
                className="text-sm font-medium text-[#231A1D] hover:text-[#7B1E3A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] px-3 py-2 rounded-lg"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[44px] cursor-pointer rounded-xl border border-[#E7DEDF] bg-white px-4 py-2 text-sm font-medium text-[#6B5B61] transition-colors duration-150 hover:bg-[#FAF7F2] hover:text-[#231A1D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              to={ROUTES.AUTH}
              className="min-h-[44px] inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#E7DEDF] bg-white px-5 py-2 text-sm font-semibold text-[#7B1E3A] transition-all duration-150 hover:border-[#7B1E3A] hover:bg-[#F3E3E8]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
