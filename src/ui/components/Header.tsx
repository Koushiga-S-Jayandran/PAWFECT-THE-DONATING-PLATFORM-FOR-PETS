import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, FileText, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { ROUTES } from '../../config/constants.js';
import { NotificationBell } from '../../features/adoption/NotificationBell.js';

export const Header: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.AUTH);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E7DEDF] bg-[#FFFFFF]/95 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 sm:h-18 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Logo & Main Nav */}
        <div className="flex items-center gap-3 sm:gap-8 min-w-0">
          <Link
            to={ROUTES.HOME}
            className="group flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] shrink-0"
            aria-label="Pawfect Home"
          >
            <img
              src="/assets/aistudio/pawfect_logo_transparent_9c2be9aa.png"
              alt="Pawfect Logo"
              className="h-9 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
            />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to={ROUTES.PETS}
              className={`rounded-lg px-3 py-2 transition-colors ${
                isActive(ROUTES.PETS)
                  ? 'bg-[#F3E3E8]/60 text-[#7B1E3A] font-semibold'
                  : 'text-[#6B5B61] hover:text-[#231A1D] hover:bg-[#FAF7F2]'
              }`}
            >
              Browse Pets
            </Link>

            {user && (
              <>
                <Link
                  to={ROUTES.MY_ADOPTIONS}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    isActive(ROUTES.MY_ADOPTIONS)
                  ? 'bg-[#F3E3E8]/60 text-[#7B1E3A] font-semibold'
                  : 'text-[#6B5B61] hover:text-[#231A1D] hover:bg-[#FAF7F2]'
                  }`}
                >
                  My Applications
                </Link>

                {user.emailVerified && (
                  <Link
                    to={ROUTES.MY_LISTINGS}
                    className={`rounded-lg px-3 py-2 transition-colors ${
                      isActive(ROUTES.MY_LISTINGS)
                        ? 'bg-[#F3E3E8]/60 text-[#7B1E3A] font-semibold'
                        : 'text-[#6B5B61] hover:text-[#231A1D] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    My Listings
                  </Link>
                )}

                <Link
                  to={ROUTES.SAVED_PETS}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    isActive(ROUTES.SAVED_PETS)
                  ? 'bg-[#F3E3E8]/60 text-[#7B1E3A] font-semibold'
                  : 'text-[#6B5B61] hover:text-[#231A1D] hover:bg-[#FAF7F2]'
                  }`}
                >
                  Saved Pets
                </Link>

                {user.emailVerified && role === 'admin' && (
                  <Link
                    to={ROUTES.ADMIN_ADOPTIONS}
                    className={`rounded-lg px-3 py-2 transition-colors ${
                      isActive(ROUTES.ADMIN_ADOPTIONS)
                        ? 'bg-[#F3E3E8]/60 text-[#7B1E3A] font-semibold'
                        : 'text-[#6B5B61] hover:text-[#231A1D] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    Admin Adoptions
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Right Nav Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user && (
            <>
              {/* Notification Bell */}
              <NotificationBell />

              {/* Saved Pets Quick Icon (Mobile) */}
              <Link
                to={ROUTES.SAVED_PETS}
                className="md:hidden flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-[#E7DEDF] bg-white text-[#6B5B61] hover:text-[#7B1E3A]"
                title="Saved Pets"
              >
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>

              {/* Profile Link */}
              <Link
                to={ROUTES.PROFILE}
                className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition-colors ${
                  isActive(ROUTES.PROFILE)
                    ? 'border-[#7B1E3A] bg-[#F3E3E8] text-[#7B1E3A]'
                    : 'border-[#E7DEDF] bg-white text-[#6B5B61] hover:bg-[#FAF7F2] hover:text-[#231A1D]'
                }`}
                title="Adopter Profile"
              >
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </>
          )}

          {user && user.emailVerified ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to={ROUTES.DASHBOARD}
                className="hidden lg:inline-flex text-xs font-medium text-[#6B5B61] hover:text-[#7B1E3A] px-2.5 py-1.5 rounded-lg"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[36px] sm:min-h-[40px] cursor-pointer rounded-xl border border-[#E7DEDF] bg-white px-2.5 sm:px-3.5 py-1 text-xs font-medium text-[#6B5B61] transition-colors duration-150 hover:bg-[#FAF7F2] hover:text-[#231A1D]"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to={ROUTES.PETS}
                className="md:hidden text-xs font-semibold text-[#7B1E3A] px-1.5"
              >
                Browse
              </Link>
              <Link
                to={ROUTES.AUTH}
                className="min-h-[36px] sm:min-h-[40px] inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#E7DEDF] bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-[#7B1E3A] transition-all duration-150 hover:border-[#7B1E3A] hover:bg-[#F3E3E8]/40"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
