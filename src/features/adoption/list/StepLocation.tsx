import React from 'react';
import { MapPin } from 'lucide-react';
import {
  getEnabledRegions,
  getDistrictsForState,
} from '../../../config/regions.js';
import type { ListingFormDraft } from '../../../domain/adoptionListingEntities.js';

interface StepLocationProps {
  draft: ListingFormDraft;
  onChange: (patch: Partial<ListingFormDraft>) => void;
  error?: string | null;
}

export const StepLocation: React.FC<StepLocationProps> = ({
  draft,
  onChange,
  error,
}) => {
  const regions = getEnabledRegions();
  const districts = getDistrictsForState(draft.stateCode);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#F6F0EC]">
          Where is the animal located?
        </h2>
        <p className="mt-1 text-sm text-[#B8A8AE]">
          Listings at launch are open across Tamil Nadu and Kerala so adopters can meet pets safely in person.
        </p>
      </div>

      {/* State Selector (Config-driven TN & KL only) */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-2">
          State *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {regions.map((region) => (
            <button
              key={region.code}
              type="button"
              onClick={() =>
                onChange({
                  stateCode: region.code,
                  district: region.districts.includes(draft.district) ? draft.district : '',
                })
              }
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                draft.stateCode === region.code
                  ? 'border-[#D94F73] bg-[#2D1B22] text-[#F6F0EC]'
                  : 'border-[#382D32] bg-[#161114] text-[#B8A8AE] hover:border-[#6A4A57]'
              }`}
            >
              <div>
                <div className="text-sm font-semibold text-[#F6F0EC]">{region.name}</div>
                <div className="text-xs text-[#8D7D83]">{region.districts.length} districts</div>
              </div>
              <MapPin
                className={`h-4 w-4 ${
                  draft.stateCode === region.code ? 'text-[#D94F73]' : 'text-[#6B5B61]'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* District & City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="listing-district" className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-1.5">
            District *
          </label>
          <select
            id="listing-district"
            value={draft.district}
            onChange={(e) => onChange({ district: e.target.value })}
            className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-4 py-3 text-sm text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
          >
            <option value="">Select district</option>
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="listing-city" className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-1.5">
            City / Locality *
          </label>
          <input
            id="listing-city"
            type="text"
            maxLength={80}
            value={draft.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="e.g. Adyar, Kakkanad, RS Puram"
            className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-4 py-3 text-sm text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none"
          />
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
