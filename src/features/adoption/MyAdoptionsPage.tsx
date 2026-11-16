import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  AlertCircle,
  Calendar,
  ExternalLink,
  Loader2,
  HeartHandshake,
  Phone,
} from 'lucide-react';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { petAdoptionService } from '../../services/PetAdoptionService.js';
import { adoptionListingRepo } from '../../repositories/FirebaseAdoptionListingRepository.js';
import { useAuth } from '../../context/AuthContext.js';
import type { AdoptionRequest } from '../../domain/petEntities.js';
import { ROUTES } from '../../config/constants.js';

export const MyAdoptionsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [unlockedPhones, setUnlockedPhones] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingPetId, setCancellingPetId] = useState<string | null>(null);
  const [cancelModalPet, setCancelModalPet] = useState<AdoptionRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setRequests([]);
      setUnlockedPhones({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = petAdoptionService.subscribeToAdopterRequests(
      user.uid,
      async (liveRequests) => {
        setRequests(liveRequests);
        setLoading(false);

        const approved = liveRequests.filter((r) => r.status === 'approved');
        if (approved.length > 0) {
          const phoneMap: Record<string, string> = {};
          await Promise.all(
            approved.map(async (r) => {
              const targetListingId = (r as any).listingId || r.petId;
              if (!targetListingId) return;
              const contact = await adoptionListingRepo.getPrivateContact(targetListingId);
              if (contact?.phone) {
                phoneMap[r.id] = contact.phone;
              }
            })
          );
          setUnlockedPhones(phoneMap);
        }
      },
      (err) => {
        console.warn('Failed to subscribe to requests:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleConfirmCancel = async () => {
    if (!user?.uid || !cancelModalPet) return;
    setCancellingPetId(cancelModalPet.petId);
    setActionError(null);

    try {
      await petAdoptionService.cancelAdoptionRequest(user.uid, cancelModalPet.petId);
      setCancelModalPet(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to cancel adoption request.');
    } finally {
      setCancellingPetId(null);
    }
  };

  const getStatusBadge = (status: AdoptionRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            Under Review by Lister
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Accepted! Contact Unlocked
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            Declined
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
            <Ban className="h-3.5 w-3.5 text-gray-500" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="mx-auto flex-1 w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Heading */}
        <div className="mb-8">
          <span className="inline-block rounded-full bg-[#F3E3E8] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#7B1E3A]">
            Adoption Portal
          </span>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#231A1D]">
            My Adoption Applications
          </h1>
          <p className="mt-1 text-sm text-[#6B5B61]">
            Track the status of your adoption inquiries and coordinate safely with listers.
          </p>
        </div>

        {actionError && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7B1E3A]" />
            <p className="mt-3 text-xs text-[#6B5B61]">
              Fetching your adoption applications...
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E7DEDF] bg-white p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF7F2] text-[#7B1E3A]">
              <HeartHandshake className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-serif text-xl font-bold text-[#231A1D]">
              No Applications Yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-[#6B5B61]">
              You haven&apos;t submitted any adoption inquiries. Browse approved rescue companions
              ready for adoption and find your companion today!
            </p>
            <Link
              to={ROUTES.PETS}
              className="mt-6 rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#63182E]"
            >
              Browse Available Pets
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const targetListingId = (req as any).listingId || req.petId;
              const unlockedPhone = unlockedPhones[req.id];
              return (
                <div
                  key={req.id}
                  className="overflow-hidden rounded-3xl border border-[#E7DEDF] bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-serif text-xl font-bold text-[#231A1D]">
                          {req.petName}
                        </h2>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6B5B61]">
                        <Calendar className="h-3.5 w-3.5" />
                        Applied on{' '}
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        to={`/pets/${targetListingId}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#E7DEDF] bg-white px-4 py-2 text-xs font-semibold text-[#6B5B61] hover:bg-[#FAF7F2] hover:text-[#231A1D]"
                      >
                        Listing Profile <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      {req.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => setCancelModalPet(req)}
                          className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Cancel Application
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Details / Rejection Reason Box */}
                  {req.status === 'rejected' && req.statusReason && (
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-3.5 text-xs text-rose-900">
                      <strong>Lister Feedback:</strong> {req.statusReason}
                    </div>
                  )}

                  {req.status === 'approved' && (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 space-y-1.5">
                      <p>
                        <strong>Next Steps:</strong> Your adoption inquiry was accepted. You can now contact the lister directly to arrange a safe meet-and-greet.
                      </p>
                      {unlockedPhone && (
                        <p className="flex items-center gap-2 font-semibold text-[#7B1E3A]">
                          <Phone className="h-3.5 w-3.5" />
                          <a href={`tel:${unlockedPhone}`} className="underline">
                            {unlockedPhone}
                          </a>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Application Summary */}
                  <div className="mt-4 border-t border-[#E7DEDF]/60 pt-3 text-xs text-[#6B5B61]">
                    <p>
                      <strong className="text-[#231A1D]">Living:</strong>{' '}
                      {(req.housingType || 'apartment').replace(/_/g, ' ')}
                      {req.experience ? ` • Experience: ${req.experience}` : ''}
                    </p>
                    <p className="mt-1">
                      <strong className="text-[#231A1D]">Statement:</strong> {req.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      {cancelModalPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => !cancellingPetId && setCancelModalPet(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-[#E7DEDF] bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-[#231A1D]">
              Cancel Adoption Application?
            </h3>
            <p className="mt-2 text-xs text-[#6B5B61] leading-relaxed">
              Are you sure you want to withdraw your adoption request for{' '}
              <strong className="text-[#231A1D]">{cancelModalPet.petName}</strong>? This action
              cannot be undone, but you can always reapply later if the pet remains available.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalPet(null)}
                disabled={Boolean(cancellingPetId)}
                className="rounded-xl border border-[#E7DEDF] px-4 py-2 text-xs font-semibold text-[#6B5B61] hover:bg-[#FAF7F2]"
              >
                Keep Application
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={Boolean(cancellingPetId)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {cancellingPetId ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
