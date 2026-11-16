import React from 'react';
import { Lock, MapPin, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ListingFormDraft } from '../../../domain/adoptionListingEntities.js';
import { getRegionByCode } from '../../../config/regions.js';

interface StepReviewPreviewProps {
  draft: ListingFormDraft;
  shelterInfo: {
    verifiedShelter: boolean;
    shelterName?: string;
  };
  isEditMode: boolean;
  wasApprovedBeforeEdit: boolean;
  error?: string | null;
}

export const StepReviewPreview: React.FC<StepReviewPreviewProps> = ({
  draft,
  shelterInfo,
  isEditMode,
  wasApprovedBeforeEdit,
  error,
}) => {
  const displayName = draft.isUnnamed ? 'Unnamed' : draft.name.trim() || 'Unnamed';
  const region = getRegionByCode(draft.stateCode);
  const ageMonths =
    draft.ageUnit === 'years' ? draft.ageValue * 12 : draft.ageValue;
  const ageLabel =
    ageMonths < 12
      ? `${ageMonths} mo`
      : ageMonths % 12 === 0
      ? `${Math.floor(ageMonths / 12)} yr${Math.floor(ageMonths / 12) > 1 ? 's' : ''}`
      : `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#F6F0EC]">
          Review &amp; Public Preview
        </h2>
        <p className="mt-1 text-sm text-[#B8A8AE]">
          This matches what adopters will see once an admin approves your listing. Your phone number is hidden.
        </p>
      </div>

      {isEditMode && wasApprovedBeforeEdit && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Saving changes to an already-approved listing resets its status to <strong>Pending Admin Review</strong> before going live again.
          </span>
        </div>
      )}

      {/* Preview Card mirroring public detail layout */}
      <div className="overflow-hidden rounded-2xl border border-[#382D32] bg-[#161114]">
        {draft.photos[0] && (
          <div className="relative aspect-16/9 w-full overflow-hidden bg-[#0F0C0D]">
            <img
              src={draft.photos[0]}
              alt={displayName}
              className="h-full w-full object-cover"
            />
            {draft.photos.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded-lg bg-black/75 px-2.5 py-1 text-xs font-medium text-[#F6F0EC]">
                +{draft.photos.length - 1} more photo{draft.photos.length > 2 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl font-bold text-[#F6F0EC]">
                {displayName}
              </h3>
              <p className="mt-0.5 text-sm text-[#B8A8AE]">
                <span className="capitalize">{draft.species}</span> · {draft.breed} · {ageLabel} ·{' '}
                <span className="capitalize">{draft.gender}</span> · <span className="capitalize">{draft.size}</span>
              </p>
            </div>

            {draft.listerType === 'shelter' && shelterInfo.verifiedShelter && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified shelter
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[#CBBBC2]">
            <span>Colour: {draft.color}</span>
            <span>Vaccinated: {draft.vaccinated ? 'Yes' : 'No'}</span>
            <span>Sterilised: {draft.sterilised ? 'Yes' : 'No'}</span>
            <span>Good with kids: {draft.goodWithKids}</span>
            <span>Good with pets: {draft.goodWithOtherPets}</span>
          </div>

          {draft.injuriesOrConditions.trim() && (
            <div className="rounded-xl border border-[#382D32] bg-[#110E10] p-3 text-xs text-[#CBBBC2]">
              <strong className="text-[#F6F0EC]">Medical notes:</strong> {draft.injuriesOrConditions}
            </div>
          )}

          <p className="text-sm leading-relaxed text-[#E3D7DC] whitespace-pre-line">
            {draft.story}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#382D32] pt-4 text-xs text-[#B8A8AE]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#D94F73]" />
              {draft.city}, {draft.district}, {region?.name || draft.stateCode}
            </span>

            <span className="inline-flex items-center gap-1.5 text-[#E2B75B]">
              <Lock className="h-3.5 w-3.5" />
              Phone hidden (unlocks only for accepted adopters)
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Upon submitting, your listing enters admin moderation with status <strong>Pending</strong> and will appear on the public Adoption Portal once approved.
        </span>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
};
