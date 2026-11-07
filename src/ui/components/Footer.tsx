import React from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG, ROUTES } from '../../config/constants.js';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#E7DEDF] bg-white py-12 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2">
              <img
                src="/assets/aistudio/pawfect_logo_transparent_9c2be9aa.png"
                alt="Pawfect"
                className="h-9 w-auto object-contain"
              />
            </div>
            <p className="mt-2 text-sm text-[#6B5B61]">
              {APP_CONFIG.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#6B5B61]">
            <Link
              to={ROUTES.HOME}
              className="min-h-[44px] inline-flex items-center hover:text-[#7B1E3A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded-lg px-2"
            >
              Home
            </Link>
            <Link
              to={ROUTES.AUTH}
              className="min-h-[44px] inline-flex items-center hover:text-[#7B1E3A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded-lg px-2"
            >
              Account Portal
            </Link>
            <span className="text-xs text-[#6B5B61]/80">
              Direct UPI Giving • 100% Free Spark Tier Backend
            </span>
          </div>
        </div>

        <div className="mt-8 border-t border-[#E7DEDF]/70 pt-6 text-center text-xs text-[#6B5B61]">
          © {new Date().getFullYear()} Pawfect India. All donations go directly to shelter UPI handles with verified photo proof.
        </div>
      </div>
    </footer>
  );
};
