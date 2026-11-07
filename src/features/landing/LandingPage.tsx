import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  QrCode,
  Camera,
  CheckCircle2,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Badge } from '../../ui/components/Badge.js';
import {
  APP_CONFIG,
  MIN_GIFT_PAISE,
  formatPaiseToRupees,
  ROUTES,
} from '../../config/constants.js';
import { authGateway } from '../../app/container.js';
import type { AuthSessionUser } from '../../domain/entities.js';

export const LandingPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);

  useEffect(() => {
    const unsubscribe = authGateway.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const actionDestination =
    currentUser && currentUser.emailVerified ? ROUTES.DASHBOARD : ROUTES.AUTH;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
              {/* Left Column: Mission & Call to Action */}
              <div className="flex flex-col items-start lg:col-span-6">
                <div className="mb-4">
                  <Badge variant="accent">
                    <span>Gifts start at just {formatPaiseToRupees(MIN_GIFT_PAISE)}</span>
                  </Badge>
                </div>

                <h1 className="font-heading text-4xl font-normal leading-[1.15] tracking-tight text-[#231A1D] sm:text-5xl lg:text-6xl">
                  Be the umbrella a shelter animal needs.
                </h1>

                <p className="mt-5 text-base leading-relaxed text-[#6B5B61] sm:text-lg">
                  {APP_CONFIG.heroSubhead}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    to={actionDestination}
                    className="min-h-[52px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#7B1E3A] px-8 py-3.5 text-base font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#5E1730] hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] focus-visible:ring-offset-2 active:bg-[#471124]"
                  >
                    <span>Start donating</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  <Link
                    to={ROUTES.AUTH}
                    className="min-h-[52px] inline-flex items-center justify-center rounded-xl border border-[#E7DEDF] bg-white px-6 py-3.5 text-sm font-semibold text-[#6B5B61] transition-all duration-150 hover:border-[#7B1E3A] hover:bg-[#FAF7F2] hover:text-[#231A1D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
                  >
                    Donor portal
                  </Link>
                </div>

                {/* Micro Guarantee */}
                <div className="mt-8 flex items-center gap-2 text-xs font-medium text-[#6B5B61]">
                  <CheckCircle2 className="h-4 w-4 text-[#2E7D5B]" aria-hidden="true" />
                  <span>100% direct payment to shelter • No platform cut</span>
                </div>
              </div>

              {/* Right Column: Umbrella Hero Image */}
              <div className="lg:col-span-6">
                <div className="group relative overflow-hidden rounded-2xl border border-[#E7DEDF] bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <img
                    src="/assets/images/umbrella_hero.jpg"
                    alt="A golden retriever dog and a tabby cat sheltering together under a large burgundy umbrella in soft rain"
                    className="aspect-4/3 w-full object-cover transition-transform duration-300 group-hover:scale-101"
                    loading="eager"
                  />
                  <div className="absolute right-3 bottom-3 rounded-md bg-[#231A1D]/75 px-2 py-1 backdrop-blur-xs">
                    <span className="text-[10px] tracking-wide text-white uppercase">
                      Illustrative image
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three Plain Steps */}
        <section className="border-t border-[#E7DEDF] bg-white py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-heading text-2xl font-medium tracking-tight text-[#231A1D] sm:text-3xl">
                How direct giving works
              </h2>
              <p className="mt-2 text-sm text-[#6B5B61]">
                Simple, transparent shelter support in three honest steps.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="flex flex-col items-start rounded-2xl border border-[#E7DEDF] bg-[#FAF7F2]/60 p-6 transition-all duration-200 hover:bg-[#FAF7F2]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E3E8] text-[#7B1E3A]">
                  <HeartHandshake className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="mt-4 text-xs font-bold tracking-wider text-[#7B1E3A] uppercase">
                  Step 1
                </span>
                <h3 className="mt-1 font-heading text-lg font-medium text-[#231A1D]">
                  Choose a shelter
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B5B61]">
                  Browse verified shelters across India with urgent needs for daily meals, emergency treatments, or puppy vaccinations.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-start rounded-2xl border border-[#E7DEDF] bg-[#FAF7F2]/60 p-6 transition-all duration-200 hover:bg-[#FAF7F2]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E3E8] text-[#7B1E3A]">
                  <QrCode className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="mt-4 text-xs font-bold tracking-wider text-[#7B1E3A] uppercase">
                  Step 2
                </span>
                <h3 className="mt-1 font-heading text-lg font-medium text-[#231A1D]">
                  Pay by UPI
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B5B61]">
                  Scan or tap to send money straight from your favourite UPI app directly into the shelter’s bank account.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-start rounded-2xl border border-[#E7DEDF] bg-[#FAF7F2]/60 p-6 transition-all duration-200 hover:bg-[#FAF7F2]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E3E8] text-[#7B1E3A]">
                  <Camera className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="mt-4 text-xs font-bold tracking-wider text-[#7B1E3A] uppercase">
                  Step 3
                </span>
                <h3 className="mt-1 font-heading text-lg font-medium text-[#231A1D]">
                  Get photo proof
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B5B61]">
                  The shelter shares real photo verification of your meal fed or medical care delivered to the animals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="border-t border-[#E7DEDF] bg-[#F3E3E8]/30 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#E7DEDF] bg-white p-6 shadow-xs md:flex-row md:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2E7D5B]/10 text-[#2E7D5B]">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#231A1D]">
                    Pawfect never holds your money
                  </h4>
                  <p className="text-sm text-[#6B5B61]">
                    Every shelter on Pawfect is manually verified with legal trust documents and active rescue grounds.
                  </p>
                </div>
              </div>

              <Link
                to={ROUTES.AUTH}
                className="min-h-[44px] shrink-0 inline-flex items-center justify-center rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#5E1730] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
              >
                Sign up as a donor
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
