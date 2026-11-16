import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  LISTING_LIMITS,
  TEMPERAMENT_SUGGESTIONS,
  TRI_STATE_FLAGS,
} from '../../../config/adoptionListingConfig.js';
import type { ListingFormDraft } from '../../../domain/adoptionListingEntities.js';
import { sanitizeText } from '../../../security/textSanitizer.js';

interface StepHealthNatureProps {
  draft: ListingFormDraft;
  onChange: (patch: Partial<ListingFormDraft>) => void;
  error?: string | null;
}

export const StepHealthNature: React.FC<StepHealthNatureProps> = ({
  draft,
  onChange,
  error,
}) => {
  const [customTag, setCustomTag] = useState('');

  const toggleTrait = (trait: string) => {
    const exists = draft.temperament.includes(trait);
    if (exists) {
      onChange({ temperament: draft.temperament.filter((t) => t !== trait) });
    } else if (draft.temperament.length < LISTING_LIMITS.MAX_TEMPERAMENT_TAGS) {
      onChange({ temperament: [...draft.temperament, trait] });
    }
  };

  const handleAddCustom = () => {
    const cleaned = sanitizeText(customTag);
    if (
      cleaned.length >= 2 &&
      cleaned.length <= 32 &&
      !draft.temperament.includes(cleaned) &&
      draft.temperament.length < LISTING_LIMITS.MAX_TEMPERAMENT_TAGS
    ) {
      onChange({ temperament: [...draft.temperament, cleaned] });
      setCustomTag('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#F6F0EC]">
          Health &amp; Nature
        </h2>
        <p className="mt-1 text-sm text-[#B8A8AE]">
          Honest medical and social details help adopters prepare the right home.
        </p>
      </div>

      {/* Vaccinated & Sterilised Switches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center justify-between rounded-2xl border border-[#382D32] bg-[#161114] p-4 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-[#F6F0EC]">Vaccinated</div>
            <div className="text-xs text-[#B8A8AE]">Core vaccines given or started</div>
          </div>
          <input
            type="checkbox"
            checked={draft.vaccinated}
            onChange={(e) => onChange({ vaccinated: e.target.checked })}
            className="h-5 w-5 rounded border-[#382D32] text-[#D94F73]"
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-[#382D32] bg-[#161114] p-4 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-[#F6F0EC]">Sterilised / Neutered</div>
            <div className="text-xs text-[#B8A8AE]">Spayed or neutered by a vet</div>
          </div>
          <input
            type="checkbox"
            checked={draft.sterilised}
            onChange={(e) => onChange({ sterilised: e.target.checked })}
            className="h-5 w-5 rounded border-[#382D32] text-[#D94F73]"
          />
        </label>
      </div>

      {/* Injuries / Medical Conditions */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label htmlFor="injuries-input" className="text-xs font-semibold uppercase tracking-wider text-[#B8A8AE]">
            Injuries, Special Needs, or Medical History
          </label>
          <span className="text-xs text-[#8D7D83]">{draft.injuriesOrConditions.length}/400</span>
        </div>
        <textarea
          id="injuries-input"
          rows={3}
          maxLength={400}
          value={draft.injuriesOrConditions}
          onChange={(e) => onChange({ injuriesOrConditions: e.target.value })}
          placeholder="Leave blank or write 'None' if healthy. Note any past fracture, tick fever recovery, eye condition, or ongoing medication."
          className="w-full rounded-xl border border-[#382D32] bg-[#161114] p-3.5 text-sm text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none"
        />
      </div>

      {/* Temperament Tags */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#B8A8AE]">
            Temperament &amp; Personality * ({draft.temperament.length}/{LISTING_LIMITS.MAX_TEMPERAMENT_TAGS})
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPERAMENT_SUGGESTIONS.map((trait) => {
            const active = draft.temperament.includes(trait);
            return (
              <button
                key={trait}
                type="button"
                onClick={() => toggleTrait(trait)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#D94F73] bg-[#7B1E3A] text-white'
                    : 'border-[#382D32] bg-[#161114] text-[#CBBBC2] hover:border-[#6A4A57]'
                }`}
              >
                {trait}
              </button>
            );
          })}
          {draft.temperament
            .filter((t) => !(TEMPERAMENT_SUGGESTIONS as readonly string[]).includes(t))
            .map((custom) => (
              <button
                key={custom}
                type="button"
                onClick={() => toggleTrait(custom)}
                className="inline-flex items-center gap-1 rounded-xl border border-[#D94F73] bg-[#7B1E3A] px-3 py-1.5 text-xs font-medium text-white"
              >
                {custom}
                <X className="h-3 w-3" />
              </button>
            ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customTag}
            maxLength={32}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="Add custom trait (e.g. Crate-trained)"
            className="flex-1 rounded-xl border border-[#382D32] bg-[#161114] px-3.5 py-2 text-xs text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="inline-flex items-center gap-1 rounded-xl border border-[#382D32] bg-[#251E21] px-3.5 py-2 text-xs font-semibold text-[#F6F0EC] hover:border-[#D94F73]"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* Compatibility: Kids & Other Pets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-2">
            Good with Kids?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TRI_STATE_FLAGS.map((flag) => (
              <button
                key={flag}
                type="button"
                onClick={() => onChange({ goodWithKids: flag })}
                className={`rounded-xl border py-2.5 text-xs font-semibold capitalize transition-colors ${
                  draft.goodWithKids === flag
                    ? 'border-[#D94F73] bg-[#7B1E3A] text-white'
                    : 'border-[#382D32] bg-[#161114] text-[#B8A8AE] hover:border-[#6A4A57]'
                }`}
              >
                {flag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-2">
            Good with Other Pets?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TRI_STATE_FLAGS.map((flag) => (
              <button
                key={flag}
                type="button"
                onClick={() => onChange({ goodWithOtherPets: flag })}
                className={`rounded-xl border py-2.5 text-xs font-semibold capitalize transition-colors ${
                  draft.goodWithOtherPets === flag
                    ? 'border-[#D94F73] bg-[#7B1E3A] text-white'
                    : 'border-[#382D32] bg-[#161114] text-[#B8A8AE] hover:border-[#6A4A57]'
                }`}
              >
                {flag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
};
