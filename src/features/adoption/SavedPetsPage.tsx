import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { PetCard } from './PetCard.js';
import { petAdoptionService } from '../../services/PetAdoptionService.js';
import { adoptionListingService } from '../../services/AdoptionListingService.js';
import { useAuth } from '../../context/AuthContext.js';
import type { AdoptionListing } from '../../domain/adoptionListingEntities.js';
import { ROUTES } from '../../config/constants.js';

export const SavedPetsPage: React.FC = () => {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<{ listing: AdoptionListing; isAvailable: boolean }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setSavedItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = petAdoptionService.subscribeToFavorites(user.uid, async (favIds) => {
      try {
        if (favIds.length === 0) {
          setSavedItems([]);
          setLoading(false);
          return;
        }
        const results: { listing: AdoptionListing; isAvailable: boolean }[] = [];
        for (const id of favIds) {
          try {
            const listing = await adoptionListingService.getListingById(id);
            if (listing) {
              results.push({
                listing,
                isAvailable: listing.status === 'approved',
              });
            }
          } catch {
            // Skip listings that are hidden/private or deleted
          }
        }
        setSavedItems(results);
      } catch (err) {
        console.warn('Failed to load saved listings:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleRemoveFavorite = async (listingId: string) => {
    if (!user?.uid) return;
    setRemovingId(listingId);
    try {
      await petAdoptionService.toggleFavorite(user.uid, listingId, false);
      setSavedItems((prev) => prev.filter((item) => item.listing.id !== listingId));
    } catch (err) {
      console.warn('Failed to remove favorite:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-block rounded-full bg-[#F3E3E8] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#7B1E3A]">
              Favorites
            </span>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#231A1D]">
              Saved Companions
            </h1>
            <p className="mt-1 text-sm text-[#6B5B61]">
              Keep track of animals you love and monitor their adoption availability.
            </p>
          </div>

          <Link
            to={ROUTES.PETS}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold text-[#7B1E3A] hover:underline"
          >
            Explore more listings <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7B1E3A]" />
            <p className="mt-3 text-xs text-[#6B5B61]">Loading your saved companions...</p>
          </div>
        ) : savedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E7DEDF] bg-white p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF7F2] text-[#7B1E3A]">
              <Heart className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-serif text-xl font-bold text-[#231A1D]">
              Your Saved List is Empty
            </h3>
            <p className="mt-2 max-w-md text-sm text-[#6B5B61]">
              Tap the heart icon on any companion card while browsing to save them here for quick comparison.
            </p>
            <Link
              to={ROUTES.PETS}
              className="mt-6 rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#63182E]"
            >
              Browse Companions
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {savedItems.map(({ listing, isAvailable }) => (
              <div key={listing.id} className="relative">
                <PetCard
                  listing={listing}
                  isFavorited={true}
                  onFavoriteToggled={(id, isFav) => {
                    if (!isFav) {
                      setSavedItems((prev) => prev.filter((item) => item.listing.id !== id));
                    }
                  }}
                />

                {!isAvailable && (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Status: {listing.status.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(listing.id)}
                      disabled={removingId === listing.id}
                      className="text-amber-800 hover:text-amber-950 p-1"
                      title="Remove from saved"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
