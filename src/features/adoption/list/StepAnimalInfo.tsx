import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Building2, User } from 'lucide-react';
import {
  LISTING_GENDERS,
  LISTING_SIZES,
  LISTING_SPECIES,
  type ListerType,
} from '../../../config/adoptionListingConfig.js';
import type { ListingFormDraft } from '../../../domain/adoptionListingEntities.js';
import { SHELTER_ROUTES } from '../../../config/shelterRoutes.js';

interface ShelterStatusInfo {
  verifiedShelter: boolean;
  hasShelterRecord: boolean;
  shelterName?: string;
  shelterStatus?: string;
}

interface StepAnimalInfoProps {
  draft: ListingFormDraft;
  onChange: (patch: Partial<ListingFormDraft>) => void;
  shelterInfo: ShelterStatusInfo;
  error?: string | null;
}

export const StepAnimalInfo: React.FC<StepAnimalInfoProps> = ({
  draft,
  onChange,
  shelterInfo,
  error,
}) => {
  const handleListerType = (type: ListerType) => {
    onChange({ listerType: type });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#F6F0EC]">
          Who are you listing?
        </h2>
        <p className="mt-1 text-sm text-[#B8A8AE]">
          Tell adopters about the animal and whether you are listing as an individual rescuer or a shelter.
        </p>
      </div>

      {/* Lister Type Selector */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-2">
          Listing As
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleListerType('individual')}
            className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-150 ${
              draft.listerType === 'individual'
                ? 'border-[#D94F73] bg-[#2D1B22] text-[#F6F0EC]'
                : 'border-[#382D32] bg-[#161114] text-[#B8A8AE] hover:border-[#6A4A57]'
            }`}
          >
            <User className="h-5 w-5 shrink-0 mt-0.5 text-[#D94F73]" />
            <div>
              <div className="text-sm font-semibold text-[#F6F0EC]">Individual Rescuer / Owner</div>
              <p className="mt-0.5 text-xs text-[#B8A8AE]">
                Fostering a rescue, indie pup/kitten, or rehoming responsibly.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleListerType('shelter')}
            className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-150 ${
              draft.listerType === 'shelter'
                ? 'border-[#D94F73] bg-[#2D1B22] text-[#F6F0EC]'
                : 'border-[#382D32] bg-[#161114] text-[#B8A8AE] hover:border-[#6A4A57]'
            }`}
          >
            <Building2 className="h-5 w-5 shrink-0 mt-0.5 text-[#E2B75B]" />
            <div>
              <div className="text-sm font-semibold text-[#F6F0EC]">Registered Shelter</div>
              <p className="mt-0.5 text-xs text-[#B8A8AE]">
                Displays a Verified Shelter badge once your shelter is admin-approved.
              </p>
            </div>
          </button>
        </div>

        {draft.listerType === 'shelter' && (
          <div className="mt-3 rounded-xl border border-[#382D32] bg-[#161114] p-3.5 text-xs">
            {shelterInfo.verifiedShelter ? (
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>
                  Verified Shelter active: <strong>{shelterInfo.shelterName}</strong>. Your listing will carry the Verified Shelter badge.
                </span>
              </div>
            ) : shelterInfo.hasShelterRecord ? (
              <div className="text-amber-300">
                Shelter found (<strong>{shelterInfo.shelterName}</strong>, status: {shelterInfo.shelterStatus}). The Verified Shelter badge will appear only after an admin approves your shelter.
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-rose-300">
                <span>No shelter registration found for your account yet.</span>
                <Link
                  to={SHELTER_ROUTES.REGISTER}
                  className="font-semibold underline text-[#E2B75B] hover:text-[#F6F0EC]"
                >
                  Register Shelter →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Name or Unnamed */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="animal-name" className="text-xs font-semibold uppercase tracking-wider text-[#B8A8AE]">
            Animal Name
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#E2B75B]">
            <input
              type="checkbox"
              checked={draft.isUnnamed}
              onChange={(e) =>
                onChange({
                  isUnnamed: e.target.checked,
                  name: e.target.checked ? 'Unnamed' : draft.name === 'Unnamed' ? '' : draft.name,
                })
              }
              className="h-4 w-4 rounded border-[#382D32] bg-[#161114] text-[#D94F73]"
            />
            Mark as Unnamed
          </label>
        </div>
        <input
          id="animal-name"
          type="text"
          value={draft.isUnnamed ? 'Unnamed' : draft.name}
          disabled={draft.isUnnamed}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={50}
          placeholder="e.g. Chinnu, Coco, Simba"
          className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-4 py-3 text-sm text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none disabled:opacity-60"
        />
      </div>

      {/* Species */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-2">
          Species *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {LISTING_SPECIES.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => onChange({ species: sp })}
              className={`rounded-xl border py-3 text-sm font-semibold capitalize transition-colors ${
                draft.species === sp
                  ? 'border-[#D94F73] bg-[#7B1E3A] text-white'
                  : 'border-[#382D32] bg-[#161114] text-[#B8A8AE] hover:border-[#6A4A57]'
              }`}
            >
              {sp}
            </button>
          ))}
        </div>
      </div>

      {/* Breed & Colour */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="animal-breed" className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-1.5">
            Breed / Mix *
          </label>
          <input
            id="animal-breed"
            type="text"
            value={draft.breed}
            onChange={(e) => onChange({ breed: e.target.value })}
            maxLength={80}
            placeholder="e.g. Indian Pariah / Indie, Tabby"
            className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-4 py-3 text-sm text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="animal-color" className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-1.5">
            Colour / Markings *
          </label>
          <input
            id="animal-color"
            type="text"
            value={draft.color}
            onChange={(e) => onChange({ color: e.target.value })}
            maxLength={60}
            placeholder="e.g. Fawn & white, Ginger tabby"
            className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-4 py-3 text-sm text-[#F6F0EC] placeholder-[#7B6B71] focus:border-[#D94F73] focus:outline-none"
          />
        </div>
      </div>

      {/* Age & Gender */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="animal-age" className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-1.5">
            Approximate Age *
          </label>
          <div className="flex gap-2">
            <input
              id="animal-age"
              type="number"
              min={0}
              max={draft.ageUnit === 'years' ? 25 : 300}
              value={draft.ageValue}
              onChange={(e) =>
                onChange({ ageValue: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })
              }
              className="w-28 rounded-xl border border-[#382D32] bg-[#161114] px-4 py-3 text-sm text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
            />
            <select
              value={draft.ageUnit}
              onChange={(e) =>
                onChange({ ageUnit: e.target.value === 'years' ? 'years' : 'months' })
              }
              aria-label="Age unit"
              className="flex-1 rounded-xl border border-[#382D32] bg-[#161114] px-3 py-3 text-sm text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
            >
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-1.5">
            Gender *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LISTING_GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChange({ gender: g })}
                className={`rounded-xl border py-3 text-xs font-semibold capitalize transition-colors ${
                  draft.gender === g
                    ? 'border-[#D94F73] bg-[#7B1E3A] text-white'
                    : 'border-[#382D32] bg-[#161114] text-[#B8A8AE] hover:border-[#6A4A57]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Size */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#B8A8AE] mb-2">
          Expected Adult Size *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {LISTING_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => onChange({ size: sz })}
              className={`rounded-xl border py-3 text-xs font-semibold capitalize transition-colors ${
                draft.size === sz
                  ? 'border-[#D94F73] bg-[#7B1E3A] text-white'
                  : 'border-[#382D32] bg-[#161114] text-[#B8A8AE] hover:border-[#6A4A57]'
              }`}
            >
              {sz}
            </button>
          ))}
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
