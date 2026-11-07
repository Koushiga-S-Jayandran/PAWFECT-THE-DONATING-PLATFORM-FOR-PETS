import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shelterBrowseService } from '../../app/container.js';
import type { Shelter } from '../../domain/shelterEntities.js';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { SHELTER_ROUTES } from '../../config/shelterRoutes.js';
import { getRegionByCode } from '../../config/regions.js';
import { getAnimalTypeLabel } from '../../config/animalTypes.js';
import {
  CheckCircle2,
  MapPin,
  Heart,
  ArrowLeft,
  AlertTriangle,
  Building2,
  Lock,
} from 'lucide-react';

export const ShelterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    shelterBrowseService
      .getShelterDetails(id)
      .then((data) => {
        setShelter(data);
      })
      .catch(() => {
        setShelter(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
            <p className="text-xs text-[#6B5B61]">Loading shelter details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Zero-Trust: If not found or not APPROVED, identical generic message
  if (!shelter) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-16 text-center">
          <Card padding="lg" className="max-w-md shadow-xs space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E3E8] text-[#7B1E3A]">
              <Building2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="font-heading text-2xl font-medium text-[#231A1D]">
              Shelter not found
            </h1>
            <p className="text-xs text-[#6B5B61]">
              The shelter you are looking for does not exist or has not been verified yet.
            </p>
            <div className="pt-2">
              <Link to={SHELTER_ROUTES.BROWSE}>
                <Button variant="primary" size="md">
                  Browse verified shelters
                </Button>
              </Link>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const region = getRegionByCode(shelter.stateCode);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="border-b border-[#E7DEDF] bg-white py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Link
              to={SHELTER_ROUTES.BROWSE}
              className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-[#6B5B61] hover:text-[#231A1D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded-lg px-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to all shelters</span>
            </Link>
          </div>
        </div>

        {/* Content Section: Two Columns on desktop, stacked on mobile */}
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left Column: Shelter Details */}
            <div className="lg:col-span-8 text-left space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {shelter.verified && (
                    <Badge variant="success" className="gap-1 py-1 px-3">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Verified Shelter</span>
                    </Badge>
                  )}

                  {shelter.urgency === 'NORMAL' && (
                    <Badge variant="neutral" className="py-1 px-3">
                      Normal care
                    </Badge>
                  )}
                  {shelter.urgency === 'URGENT' && (
                    <Badge variant="warning" className="py-1 px-3">
                      Urgent need
                    </Badge>
                  )}
                  {shelter.urgency === 'CRITICAL' && (
                    <Badge variant="primary" className="py-1 px-3 bg-[#B4423A] text-white">
                      Critical emergency
                    </Badge>
                  )}
                </div>

                <h1 className="font-heading text-3xl font-medium tracking-tight text-[#231A1D] sm:text-4xl">
                  {shelter.name}
                </h1>

                <div className="mt-2 flex items-center gap-1.5 text-sm text-[#6B5B61]">
                  <MapPin className="h-4 w-4 text-[#7B1E3A] shrink-0" />
                  <span>
                    {shelter.area}, {shelter.district}, {region?.name}
                  </span>
                </div>
              </div>

              {/* Urgency Callout if Urgent or Critical */}
              {(shelter.urgency === 'URGENT' || shelter.urgency === 'CRITICAL') && (
                <div
                  role="region"
                  className={`rounded-2xl border p-5 text-xs flex items-start gap-3.5 ${
                    shelter.urgency === 'CRITICAL'
                      ? 'border-[#B4423A]/30 bg-[#B4423A]/10 text-[#B4423A]'
                      : 'border-[#B7791F]/30 bg-[#B7791F]/10 text-[#915f16]'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-semibold text-sm">
                      {shelter.urgency === 'CRITICAL' ? 'Critical Emergency Notice' : 'Urgent Shelter Need'}
                    </p>
                    <p className="mt-1">
                      {shelter.urgencyNote || 'This shelter has an urgent need for daily meal supplies and rescue medicine.'}
                    </p>
                  </div>
                </div>
              )}

              {/* What They Care For */}
              <Card padding="md" className="shadow-xs space-y-3">
                <h2 className="text-sm font-semibold text-[#231A1D]">
                  Animals Cared For
                </h2>
                <div className="flex flex-wrap gap-2">
                  {shelter.animalTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] px-3.5 py-1.5 text-xs font-medium text-[#231A1D]"
                    >
                      {getAnimalTypeLabel(type)}
                    </span>
                  ))}
                </div>
              </Card>

              {/* About the Shelter */}
              <Card padding="md" className="shadow-xs space-y-3">
                <h2 className="text-sm font-semibold text-[#231A1D]">
                  About This Shelter
                </h2>
                <p className="text-sm leading-relaxed text-[#6B5B61] whitespace-pre-line">
                  {shelter.description}
                </p>
              </Card>

              {/* Shelter Trust Notice */}
              <div className="rounded-2xl border border-[#E7DEDF] bg-white p-5 text-xs text-[#6B5B61] space-y-2">
                <p className="font-semibold text-[#231A1D]">Verified Transparency</p>
                <p className="leading-relaxed">
                  Pawfect independently verifies registration and shelter premises. Once online giving opens, donations will be paid directly to the shelter's UPI bank account with photo proof sent upon delivery.
                </p>
              </div>
            </div>

            {/* Right Column: Photo & Action Panel */}
            <div className="lg:col-span-4 space-y-6">
              <Card padding="md" className="shadow-sm space-y-5 text-left sticky top-24">
                {/* Illustrative Image Placeholder */}
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] flex items-center justify-center p-8">
                  <img
                    src="/assets/aistudio/pawfect_logo_transparent_9c2be9aa.png"
                    alt="Pawfect shelter illustration"
                    className="h-24 w-auto object-contain opacity-80"
                  />
                  <div className="absolute right-2.5 bottom-2.5 rounded bg-[#231A1D]/75 px-2 py-0.5 text-[9px] uppercase tracking-wide text-white backdrop-blur-xs">
                    Illustrative image
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B5B61]">Giving Method:</span>
                    <span className="font-semibold text-[#231A1D]">Direct UPI</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B5B61]">Platform Fee:</span>
                    <span className="font-semibold text-[#2E7D5B]">0% (Free Spark)</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B5B61]">Verification:</span>
                    <span className="font-semibold text-[#2E7D5B]">Direct photo proof</span>
                  </div>
                </div>

                {/* Active Gift & Donation Button */}
                <div className="pt-2 space-y-2">
                  <Link to={`/gifts?shelterId=${shelter.ownerId}`}>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full justify-center gap-2 font-semibold"
                    >
                      <Heart className="h-4 w-4" />
                      <span>Send a Gift to this Shelter</span>
                    </Button>
                  </Link>
                  <p className="text-center text-[11px] text-[#2E7D5B] font-medium">
                    100% direct UPI giving • Zero platform fee
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
