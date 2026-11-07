import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authGateway, userProfileRepository, shelterReader } from '../../app/container.js';
import type { AuthSessionUser, UserProfile } from '../../domain/entities.js';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { ROUTES } from '../../config/constants.js';
import { SHELTER_ROUTES } from '../../config/shelterRoutes.js';
import { DONATION_ROUTES } from '../../config/donationRoutes.js';
import { CheckCircle2, User, LogOut, Gift, Building2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasShelter, setHasShelter] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = authGateway.getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      userProfileRepository
        .getProfile(currentUser.uid)
        .then((p) => {
          setProfile(p);
        })
        .catch((err) => {
          console.warn('Could not load profile:', err);
        })
        .finally(() => {
          setIsLoadingProfile(false);
        });

      shelterReader
        .getShelterById(currentUser.uid)
        .then((shelter) => {
          if (shelter) {
            setHasShelter(true);
          }
        })
        .catch(() => {
          // ignore error if not found or unauthorized
        });
    } else {
      setIsLoadingProfile(false);
    }
  }, []);

  const handleLogout = async () => {
    await authGateway.signOut();
    navigate(ROUTES.AUTH, { replace: true });
  };

  const displayName = profile?.fullName || user?.displayName || user?.email || 'Donor';

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <Card padding="lg" className="shadow-xs text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F3E3E8] text-[#7B1E3A]">
              <User className="h-10 w-10" aria-hidden="true" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge variant="success" className="gap-1.5 py-1 px-3">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Email verified</span>
                </Badge>
                {profile?.role && (
                  <Badge variant="primary" className="py-1 px-3">
                    <span>{profile.role}</span>
                  </Badge>
                )}
              </div>

              <h1 className="font-heading text-3xl font-normal text-[#231A1D]">
                {isLoadingProfile ? 'Welcome back' : displayName}
              </h1>

              {user?.email && (
                <p className="mt-1.5 text-sm text-[#6B5B61]">{user.email}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
              <Link
                to={DONATION_ROUTES.CATALOG}
                className="text-[#7B1E3A] hover:underline"
              >
                Choose a gift
              </Link>
              <span className="text-[#C4B5B8]" aria-hidden="true">•</span>
              <Link
                to={DONATION_ROUTES.MY_DONATIONS}
                className="text-[#7B1E3A] hover:underline"
              >
                My gifts
              </Link>
              <span className="text-[#C4B5B8]" aria-hidden="true">•</span>
              <Link
                to={SHELTER_ROUTES.BROWSE}
                className="text-[#7B1E3A] hover:underline"
              >
                Browse shelters
              </Link>
              <span className="text-[#C4B5B8]" aria-hidden="true">•</span>
              <Link
                to={hasShelter ? SHELTER_ROUTES.STATUS : SHELTER_ROUTES.REGISTER}
                className="text-[#7B1E3A] hover:underline"
              >
                {hasShelter ? 'My shelter status' : 'Register your shelter'}
              </Link>
            </div>

            <div className="border-t border-[#E7DEDF] pt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleLogout}
                className="gap-2 px-6"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Log out</span>
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};
