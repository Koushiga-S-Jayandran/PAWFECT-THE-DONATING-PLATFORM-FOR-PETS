import React from 'react';
import { LISTING_LIMITS } from '../../../config/adoptionListingConfig.js';
import type { ListingFormDraft } from '../../../domain/adoptionListingEntities.js';
import { containsLinkOrSpam } from '../../../security/adoptionListingValidation.js';

interface StepStoryProps {
  draft: ListingFormDraft;
  onChange: (patch: Partial<ListingFormDraft>) => void;
  error?: string | null;
}

export const StepStory: React.FC<StepStoryProps> = ({
  draft,
  onChange,
  error,
}) => {
  const spamIssue = containsLinkOrSpam(draft.story);
  const count = draft.story.trim().length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#F6F0EC]">
          Why does {draft.isUnnamed ? 'this companion' : draft.name || 'this companion'} need a home?
        </h2>
        <p className="mt-1 text-sm text-[#B8A8AE]">
          Share their rescue story, daily routine, and what kind of home suits them best. Links and websites are blocked for adopter safety.
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label htmlFor="listing-story" className="text-xs font-semibold uppercase tracking-wider text-[#B8A8AE]">
            Rescue &amp; Adoption Story * (min {LISTING_LIMITS.STORY_MIN_LENGTH} characters)
          </label>
          <span
            className={`text-xs font-mono ${
              count < LISTING_LIMITS.STORY_MIN_LENGTH ? 'text-amber-300' : 'text-emerald-300'
            }`}
          >
            {draft.story.length}/{LISTING_LIMITS.STORY_MAX_LENGTH}
          </span>
        </div>

        <textarea
          id="listing-story"
          rows={7}
          maxLength={LISTING_LIMITS.STORY_MAX_LENGTH}
          value={draft.story}
          onChange={(e) => onChange({ story: e.target.value })}
          placeholder="Example: Rescued near Velachery as a stray puppy, now healthy and playful. Loves morning walks, sleeps indoors quietly, and is ready for a loving family who can give time and routine vet care."
          className="w-full rounded-2xl border border-[#382D32] bg-[#161114] p-4 text-sm leading-relaxed text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-[#382D32] bg-[#161114] p-3.5 text-xs text-[#B8A8AE]">
        Reminder: Buying or selling animals is prohibited on Pawfect. Do not mention adoption fees, prices, payment links, or phone numbers inside the story.
      </div>

      {(spamIssue || error) && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
          {spamIssue || error}
        </div>
      )}
    </div>
  );
};
