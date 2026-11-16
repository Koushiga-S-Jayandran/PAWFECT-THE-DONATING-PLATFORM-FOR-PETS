import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin, ShieldCheck, PawPrint } from 'lucide-react';
import type { AdoptionListing } from '../../domain/adoptionListingEntities.js';
import { useAuth } from '../../context/AuthContext.js';
import { petAdoptionService } from '../../services/PetAdoptionService.js';
import { ROUTES } from '../../config/constants.js';

interface PetCardProps {
  listing: AdoptionListing;
  isFavorited?: boolean;
  onFavoriteToggled?: (listingId: string, isFav: boolean) => void;
}

export const PetCard: React.FC<PetCardProps> = ({
  listing,
  isFavorited = false,
  onFavoriteToggled,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favState, setFavState] = useState<boolean>(isFavorited);
  const [imageError, setImageError] = useState(false);
  const [isUpdatingFav, setIsUpdatingFav] = useState(false);

  // Sync favState when parent async favorites finish loading
  useEffect(() => {
    setFavState(isFavorited);
  }, [isFavorited]);

  const formatAge = (months: number) => {
    if (months < 12) return `${months} mo`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return `${years} yr${years > 1 ? 's' : ''}`;
    return `${years}y ${rem}m`;
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate(`${ROUTES.AUTH}?next=${encodeURIComponent(`/pets/${listing.id}`)}`);
      return;
    }
    if (isUpdatingFav) return;

    const nextFavState = !favState;
    setFavState(nextFavState);
    onFavoriteToggled?.(listing.id, nextFavState);

    setIsUpdatingFav(true);
    try {
      await petAdoptionService.toggleFavorite(user.uid, listing.id, nextFavState);
    } catch {
      setFavState(!nextFavState);
      onFavoriteToggled?.(listing.id, !nextFavState);
    } finally {
      setIsUpdatingFav(false);
    }
  };

  const primaryPhoto = !imageError && listing.photos?.[0] ? listing.photos[0] : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E7DEDF] bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      {/* Photo Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-[#FAF7F2]">
        {primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={listing.name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#F3E3E8]/50 text-[#7B1E3A]">
            <PawPrint className="h-10 w-10 opacity-50" />
          </div>
        )}

        {/* Favorite Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={
            favState ? `Remove ${listing.name} from favorites` : `Save ${listing.name} to favorites`
          }
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#7B1E3A] shadow-xs transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              favState ? 'fill-[#7B1E3A] text-[#7B1E3A]' : 'text-[#6B5B61]'
            }`}
          />
        </button>

        {/* Top Left Overlay Status */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {listing.status === 'adopted' && (
            <span className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
              Adopted — Happy Tail
            </span>
          )}
          <span className="rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold capitalize text-[#231A1D] shadow-xs">
            {listing.species}
          </span>
          {listing.listerType === 'shelter' && listing.verifiedShelter && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/95 px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
              <ShieldCheck className="h-3 w-3" /> Verified shelter
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#231A1D] group-hover:text-[#7B1E3A] transition-colors">
              {listing.name}
            </h3>
            <p className="text-xs font-medium text-[#6B5B61]">{listing.breed}</p>
          </div>
          <span className="shrink-0 rounded-lg bg-[#FAF7F2] px-2.5 py-1 text-xs font-medium text-[#7B1E3A]">
            {formatAge(listing.ageMonths)}
          </span>
        </div>

        {/* Metadata with middle dots (zero pill clutter) */}
        <p className="mt-2.5 text-xs text-[#6B5B61] capitalize">
          {listing.gender} · {listing.size} size
          {listing.vaccinated ? ' · Vaccinated' : ''}
          {listing.sterilised ? ' · Sterilised' : ''}
        </p>

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#E7DEDF]/60 text-xs text-[#6B5B61]">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="h-3.5 w-3.5 text-[#7B1E3A] shrink-0" />
            <span className="font-medium text-[#231A1D] truncate">
              {listing.district}, {listing.stateCode}
            </span>
          </div>

          <Link
            to={`/pets/${listing.id}`}
            className="shrink-0 font-semibold text-[#7B1E3A] hover:underline rounded-sm"
          >
            Meet {listing.name} →
          </Link>
        </div>
      </div>
    </div>
  );
};
