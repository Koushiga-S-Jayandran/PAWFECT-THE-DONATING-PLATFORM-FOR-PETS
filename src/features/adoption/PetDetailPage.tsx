import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  MapPin,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  Building2,
  User,
  Share2,
  Check,
  CheckCircle2,
  Phone,
  Lock,
  Flag,
  ShieldAlert,
  PawPrint,
} from 'lucide-react';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { InterestedModal } from './InterestedModal.js';
import { ReportListingModal } from './ReportListingModal.js';
import { adoptionListingService } from '../../services/AdoptionListingService.js';
import { adoptionInterestService } from '../../services/AdoptionInterestService.js';
import { petAdoptionService } from '../../services/PetAdoptionService.js';
import { shelterReader } from '../../app/container.js';
import { useAuth } from '../../context/AuthContext.js';
import type {
  AdoptionInterestRequest,
  AdoptionListing,
} from '../../domain/adoptionListingEntities.js';
import { ROUTES } from '../../config/constants.js';

export const PetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState<AdoptionListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  const [myRequest, setMyRequest] = useState<AdoptionInterestRequest | null>(null);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isInterestedOpen, setIsInterestedOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Subscribe to real listing doc
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setActivePhotoIdx(0);

    const unsubscribe = adoptionListingService.subscribeToListing(
      id,
      (liveListing) => {
        if (!liveListing) {
          setListing(null);
          setError('This listing could not be found.');
        } else {
          setListing(liveListing);
          setError(null);
        }
        setLoading(false);
      },
      () => {
        setError('Unable to view this listing.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [id]);

  // Check admin status
  useEffect(() => {
    if (!user?.uid) {
      setIsAdmin(false);
      return;
    }
    shelterReader.checkIsAdmin(user.uid).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user?.uid]);

  // Favorites subscription
  useEffect(() => {
    if (!user?.uid || !id) {
      setIsFavorited(false);
      return;
    }
    return petAdoptionService.subscribeToFavorites(user.uid, (favIds) => {
      setIsFavorited(favIds.includes(id));
    });
  }, [user?.uid, id]);

  // Load user's inquiry and conditional protected phone
  const refreshRequestAndPhone = async () => {
    if (!listing || !user?.uid) {
      setMyRequest(null);
      setRevealedPhone(null);
      return;
    }
    const req = await adoptionInterestService.getMyRequestForListing(user.uid, listing.id);
    setMyRequest(req);

    const phone = await adoptionInterestService.getProtectedPhoneIfAuthorized({
      listing,
      viewerUid: user.uid,
      isAdmin,
      adopterRequest: req,
    });
    setRevealedPhone(phone);
  };

  useEffect(() => {
    refreshRequestAndPhone();
  }, [listing?.id, listing?.listerUid, user?.uid, isAdmin]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      navigate(`${ROUTES.AUTH}?next=${encodeURIComponent(`/pets/${id}`)}`);
      return;
    }
    if (!listing) return;

    const nextState = !isFavorited;
    setIsFavorited(nextState);
    try {
      await petAdoptionService.toggleFavorite(user.uid, listing.id, nextState);
    } catch {
      setIsFavorited(!nextState);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Adopt ${listing?.name} on Pawfect`,
          text: `Meet ${listing?.name}, a ${listing?.breed} looking for a loving home.`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const formatAgeFull = (months: number) => {
    if (months < 12) return `${months} Month${months === 1 ? '' : 's'} Old`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return `${years} Year${years > 1 ? 's' : ''} Old`;
    return `${years} Year${years > 1 ? 's' : ''}, ${rem} Month${rem > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2]">
        <Header />
        <main className="mx-auto flex flex-1 max-w-7xl items-center justify-center px-4 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7B1E3A] border-r-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2]">
        <Header />
        <main className="mx-auto flex flex-1 max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-rose-600" />
          <h1 className="mt-4 font-serif text-2xl font-bold text-[#231A1D]">
            Listing Not Found
          </h1>
          <p className="mt-2 text-sm text-[#6B5B61]">
            {error || 'This companion listing does not exist or is awaiting approval.'}
          </p>
          <Link
            to={ROUTES.PETS}
            className="mt-6 rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Back to Browse Pets
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isOwner = user?.uid === listing.listerUid;
  const photosList = listing.photos || [];
  const currentPhoto = photosList[activePhotoIdx] || null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      {/* Anti-scam safety notice */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
        <ShieldAlert className="inline h-3.5 w-3.5 mr-1.5 text-amber-700" />
        Never pay money upfront for an adoption. Buying or selling animals is prohibited on Pawfect.
      </div>

      {/* Top Breadcrumb Bar */}
      <div className="border-b border-[#E7DEDF] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to={ROUTES.PETS}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B5B61] hover:text-[#7B1E3A]"
          >
            <ArrowLeft className="h-4 w-4" /> All Listings
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7DEDF] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B5B61] hover:bg-[#FAF7F2]"
            >
              {copiedShare ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              {copiedShare ? 'Copied' : 'Share'}
            </button>

            <button
              type="button"
              onClick={handleFavoriteToggle}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7DEDF] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B1E3A] hover:bg-[#FAF7F2]"
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-[#7B1E3A]' : ''}`} />
              {isFavorited ? 'Saved' : 'Save'}
            </button>

            {!isOwner && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate(`${ROUTES.AUTH}?next=${encodeURIComponent(`/pets/${listing.id}`)}`);
                    return;
                  }
                  setIsReportOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Flag className="h-3.5 w-3.5" /> Report this listing
              </button>
            )}
          </div>
        </div>
      </div>

      {listing.status !== 'approved' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-medium text-amber-900">
          Status: <strong className="uppercase">{listing.status.replace('_', ' ')}</strong>
          {listing.status === 'adopted' && ' — This companion has found a loving home!'}
        </div>
      )}

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Photo Gallery + Story (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl border border-[#E7DEDF] bg-white shadow-xs">
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={listing.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#F3E3E8]/50 text-[#7B1E3A]">
                  <PawPrint className="h-14 w-14 opacity-50" />
                </div>
              )}

              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/95 px-3 py-1 text-xs font-bold capitalize text-[#231A1D]">
                  {listing.species}
                </span>
                {listing.listerType === 'shelter' && listing.verifiedShelter && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/95 px-3 py-1 text-xs font-semibold text-white">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified shelter
                  </span>
                )}
              </div>
            </div>

            {photosList.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {photosList.map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border-2 ${
                      activePhotoIdx === idx
                        ? 'border-[#7B1E3A] ring-2 ring-[#7B1E3A]/30'
                        : 'border-[#E7DEDF] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`${listing.name} ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-3xl border border-[#E7DEDF] bg-white p-6 shadow-xs space-y-5">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#231A1D]">
                  About {listing.name}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#6B5B61] whitespace-pre-line">
                  {listing.story}
                </p>
              </div>

              {listing.injuriesOrConditions && listing.injuriesOrConditions !== 'None reported' && (
                <div className="rounded-2xl border border-[#E7DEDF] bg-[#FAF7F2] p-4 text-xs text-[#231A1D]">
                  <strong>Health &amp; Medical Notes:</strong> {listing.injuriesOrConditions}
                </div>
              )}

              {listing.temperament.length > 0 && (
                <div className="border-t border-[#E7DEDF]/60 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B5B61]">
                    Temperament &amp; Compatibility
                  </h3>
                  <p className="mt-2 text-sm text-[#231A1D]">
                    {listing.temperament.join(' · ')}
                  </p>
                  <p className="mt-1.5 text-xs text-[#6B5B61] capitalize">
                    Good with kids: <strong>{listing.goodWithKids}</strong> · Good with other pets:{' '}
                    <strong>{listing.goodWithOtherPets}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Specs, Lister & Interest / Protected Phone (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-[#E7DEDF] bg-white p-6 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-[#231A1D]">
                    {listing.name}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-[#6B5B61]">
                    {listing.breed} · {listing.color}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl bg-[#F3E3E8] px-3.5 py-1.5 text-xs font-bold text-[#7B1E3A]">
                  {formatAgeFull(listing.ageMonths)}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-b border-[#E7DEDF]/60 py-4 text-xs">
                <div className="rounded-xl bg-[#FAF7F2] p-3">
                  <span className="block text-[#6B5B61]">Gender</span>
                  <strong className="text-sm font-semibold capitalize text-[#231A1D]">
                    {listing.gender}
                  </strong>
                </div>
                <div className="rounded-xl bg-[#FAF7F2] p-3">
                  <span className="block text-[#6B5B61]">Size</span>
                  <strong className="text-sm font-semibold capitalize text-[#231A1D]">
                    {listing.size}
                  </strong>
                </div>
                <div className="rounded-xl bg-[#FAF7F2] p-3">
                  <span className="block text-[#6B5B61]">Sterilised</span>
                  <strong className="text-sm font-semibold text-[#231A1D]">
                    {listing.sterilised ? 'Yes' : 'No'}
                  </strong>
                </div>
                <div className="rounded-xl bg-[#FAF7F2] p-3">
                  <span className="block text-[#6B5B61]">Vaccinated</span>
                  <strong className="text-sm font-semibold text-[#231A1D]">
                    {listing.vaccinated ? 'Yes' : 'No'}
                  </strong>
                </div>
              </div>

              {/* Action Area */}
              <div className="mt-6 space-y-3">
                {isOwner ? (
                  <Link
                    to={ROUTES.MY_LISTINGS}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-[#7B1E3A] bg-[#F3E3E8]/40 px-6 py-3 text-sm font-semibold text-[#7B1E3A]"
                  >
                    Manage in My Listings →
                  </Link>
                ) : !user ? (
                  <Link
                    to={`${ROUTES.AUTH}?next=${encodeURIComponent(`/pets/${listing.id}`)}`}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[#7B1E3A] px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#5E1730]"
                  >
                    Sign In — I&apos;m Interested
                  </Link>
                ) : listing.status !== 'approved' ? (
                  <div className="rounded-2xl bg-gray-100 px-6 py-3.5 text-center text-sm font-semibold text-gray-600">
                    Not accepting new inquiries ({listing.status.replace('_', ' ')})
                  </div>
                ) : myRequest?.status === 'approved' ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Inquiry Accepted — Contact Number Unlocked
                    </div>
                    {revealedPhone ? (
                      <a
                        href={`tel:${revealedPhone}`}
                        className="inline-flex items-center gap-2 text-base font-bold text-[#7B1E3A] underline"
                      >
                        <Phone className="h-4 w-4" /> {revealedPhone}
                      </a>
                    ) : (
                      <p className="text-xs text-emerald-800">Loading verified contact number...</p>
                    )}
                  </div>
                ) : myRequest?.status === 'pending' ? (
                  <Link
                    to={ROUTES.MY_ADOPTIONS}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-100 px-6 py-3.5 text-sm font-semibold text-amber-900"
                  >
                    Inquiry Pending Review — View Status
                  </Link>
                ) : myRequest?.status === 'rejected' ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-center text-xs font-semibold text-rose-800">
                    Your inquiry was declined by the lister.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsInterestedOpen(true)}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#7B1E3A] px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#5E1730]"
                  >
                    <Heart className="h-5 w-5 fill-white" /> I&apos;m interested
                  </button>
                )}

                {!revealedPhone && (
                  <p className="flex items-center justify-center gap-1.5 text-xs text-[#6B5B61]">
                    <Lock className="h-3.5 w-3.5 text-[#7B1E3A]" />
                    Phone number hidden until lister accepts your inquiry.
                  </p>
                )}
              </div>
            </div>

            {/* Lister Info Card */}
            <div className="rounded-3xl border border-[#E7DEDF] bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                {listing.listerType === 'shelter' ? (
                  <Building2 className="h-5 w-5 text-[#7B1E3A]" />
                ) : (
                  <User className="h-5 w-5 text-[#7B1E3A]" />
                )}
                <h3 className="font-serif text-lg font-bold text-[#231A1D]">
                  {listing.listerType === 'shelter' ? 'Listed by Shelter' : 'Listed by Rescuer'}
                </h3>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm text-[#231A1D]">
                    {listing.listerType === 'shelter' && listing.shelterName
                      ? listing.shelterName
                      : listing.contactName}
                  </h4>
                  <p className="flex items-center gap-1 text-xs text-[#6B5B61] mt-0.5">
                    <MapPin className="h-3 w-3 text-[#7B1E3A]" />
                    {listing.city}, {listing.district}, {listing.stateName}
                  </p>
                </div>

                {listing.listerType === 'shelter' && listing.verifiedShelter && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified shelter
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <InterestedModal
        listing={listing}
        isOpen={isInterestedOpen}
        onClose={() => setIsInterestedOpen(false)}
        onSuccess={refreshRequestAndPhone}
      />

      <ReportListingModal
        listing={listing}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      <Footer />
    </div>
  );
};
