import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, HeartHandshake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { HOUSING_TYPES, type ListingHousingType } from '../../config/adoptionListingConfig.js';
import type { AdoptionListing } from '../../domain/adoptionListingEntities.js';
import { adoptionInterestService } from '../../services/AdoptionInterestService.js';

interface InterestedModalProps {
  listing: AdoptionListing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const HOUSING_LABELS: Record<ListingHousingType, string> = {
  own_apartment: 'Own Apartment',
  rent_apartment: 'Rented Apartment',
  own_house: 'Independent House',
  rent_house: 'Rented House',
};

export const InterestedModal: React.FC<InterestedModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [housingType, setHousingType] = useState<ListingHousingType>('own_apartment');
  const [experience, setExperience] = useState('Had pets before');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(profile?.fullName || profile?.name || '');
      setError(null);
      setDone(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setError(null);
    setSubmitting(true);

    try {
      await adoptionInterestService.submitInterest({
        listing,
        adopterUid: user.uid,
        adopterEmail: user.email || '',
        name,
        housingType,
        experience,
        reason,
      });
      setDone(true);
      onSuccess();
    } catch (err: any) {
      setError(err?.issues?.[0]?.message || err?.message || 'Could not send your inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/70"
        onClick={() => !submitting && onClose()}
      />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[#382D32] bg-[#1B1618] p-6 text-[#F6F0EC] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#382D32] pb-4">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="h-5 w-5 text-[#D94F73]" />
            <div>
              <h2 className="font-serif text-xl font-bold">I&apos;m Interested in {listing.name}</h2>
              <p className="text-xs text-[#B8A8AE]">
                The lister reviews your intro before deciding to reveal their phone number.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#B8A8AE] hover:text-[#F6F0EC]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h3 className="font-serif text-xl font-bold">Inquiry Sent!</h3>
            <p className="text-xs text-[#CBBBC2] max-w-sm mx-auto">
              If the lister accepts your application, their verified contact number will unlock automatically right here and in My Applications.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#932547]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBBBC2] mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-3.5 py-2.5 text-sm text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#CBBBC2] mb-1">
                  Home Type *
                </label>
                <select
                  value={housingType}
                  onChange={(e) => setHousingType(e.target.value as ListingHousingType)}
                  className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-3 py-2.5 text-xs text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
                >
                  {HOUSING_TYPES.map((ht) => (
                    <option key={ht} value={ht}>
                      {HOUSING_LABELS[ht]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CBBBC2] mb-1">
                  Pet Care Experience *
                </label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-3 py-2.5 text-xs text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
                >
                  <option value="First-time pet parent">First-time pet parent</option>
                  <option value="Had pets before">Had pets before</option>
                  <option value="Experienced rescuer / owner">Experienced rescuer / owner</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBBBC2] mb-1">
                Why do you want to adopt {listing.name}? * (min 20 chars)
              </label>
              <textarea
                rows={4}
                required
                maxLength={600}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell the lister about your household, daily care routine, and why this companion fits your family..."
                className="w-full rounded-xl border border-[#382D32] bg-[#161114] p-3 text-xs text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-[#382D32] px-4 py-2 text-xs font-semibold text-[#CBBBC2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7B1E3A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#932547] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                  </>
                ) : (
                  'Send Inquiry'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
