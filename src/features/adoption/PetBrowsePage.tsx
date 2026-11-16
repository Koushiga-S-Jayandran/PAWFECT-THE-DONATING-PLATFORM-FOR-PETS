import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  X,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Plus,
  ShieldAlert,
  HeartHandshake,
  PawPrint,
} from 'lucide-react';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { PetCard } from './PetCard.js';
import { petAdoptionService } from '../../services/PetAdoptionService.js';
import { adoptionListingService } from '../../services/AdoptionListingService.js';
import { useAuth } from '../../context/AuthContext.js';
import { ROUTES } from '../../config/constants.js';
import { getEnabledRegions, getDistrictsForState } from '../../config/regions.js';
import {
  LISTING_SPECIES,
  type ListingGender,
  type ListingSize,
  type ListingSpecies,
} from '../../config/adoptionListingConfig.js';
import type {
  AdoptionListing,
  ListingFilterCriteria,
} from '../../domain/adoptionListingEntities.js';
import type { DocumentSnapshot } from 'firebase/firestore';

export const PetBrowsePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Filter States initialized from URL Query String
  const viewTab = searchParams.get('tab') === 'happy-tails' ? 'happy-tails' : 'available';
  const speciesParam = searchParams.get('species') as ListingSpecies | null;
  const stateParam = searchParams.get('state') || '';
  const districtParam = searchParams.get('district') || '';
  const ageRangeParam = searchParams.get('age') as
    | 'puppy_kitten'
    | 'young'
    | 'adult'
    | 'senior'
    | null;
  const genderParam = searchParams.get('gender') as ListingGender | null;
  const sizeParam = searchParams.get('size') as ListingSize | null;
  const vaccinatedParam = searchParams.get('vaccinated');
  const sortParam = (searchParams.get('sort') || 'newest') as
    | 'newest'
    | 'youngest'
    | 'oldest';
  const queryParam = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(queryParam);
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const activeRequestIdRef = useRef<number>(0);

  // Listen to user favorites if authenticated
  useEffect(() => {
    if (!user?.uid) {
      setFavoriteIds([]);
      return;
    }
    const unsub = petAdoptionService.subscribeToFavorites(user.uid, setFavoriteIds);
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  const updateQueryParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
          if (key === 'state') {
            next.delete('district');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== queryParam) {
        updateQueryParam('q', searchInput.trim() || null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, queryParam, updateQueryParam]);

  const buildCriteria = useCallback((): ListingFilterCriteria => {
    return {
      species: speciesParam || undefined,
      stateCode: stateParam || undefined,
      district: districtParam || undefined,
      ageRange: ageRangeParam || undefined,
      gender: genderParam || undefined,
      size: sizeParam || undefined,
      vaccinated:
        vaccinatedParam === 'true'
          ? true
          : vaccinatedParam === 'false'
          ? false
          : undefined,
      searchQuery: queryParam || undefined,
      sortBy: sortParam,
      includeAdopted: viewTab === 'happy-tails',
    };
  }, [
    speciesParam,
    stateParam,
    districtParam,
    ageRangeParam,
    genderParam,
    sizeParam,
    vaccinatedParam,
    queryParam,
    sortParam,
    viewTab,
  ]);

  const executeQuery = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await adoptionListingService.fetchPublicListings(
        buildCriteria(),
        12,
        null
      );
      if (requestId === activeRequestIdRef.current) {
        setListings(result.listings);
        setLastDoc(result.lastVisibleDoc);
        setHasMore(result.hasMore);
      }
    } catch (err: any) {
      if (requestId === activeRequestIdRef.current) {
        setError(
          err?.message ||
            'Failed to load listings. Please check your connection and retry.'
        );
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [buildCriteria]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  const handleLoadMore = async () => {
    if (!lastDoc || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await adoptionListingService.fetchPublicListings(
        buildCriteria(),
        12,
        lastDoc
      );
      setListings((prev) => [...prev, ...result.listings]);
      setLastDoc(result.lastVisibleDoc);
      setHasMore(result.hasMore);
    } catch {
      // keep existing items visible
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    const next = new URLSearchParams();
    if (viewTab === 'happy-tails') next.set('tab', 'happy-tails');
    setSearchParams(next, { replace: true });
  };

  const regions = getEnabledRegions();
  const availableDistricts = stateParam ? getDistrictsForState(stateParam) : [];

  const listAnimalTarget = user?.emailVerified
    ? ROUTES.LIST_ANIMAL
    : `${ROUTES.AUTH}?next=${encodeURIComponent(ROUTES.LIST_ANIMAL)}`;

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (speciesParam) {
    activeChips.push({
      key: 'species',
      label: `Species: ${speciesParam}`,
      onRemove: () => updateQueryParam('species', null),
    });
  }
  if (stateParam) {
    activeChips.push({
      key: 'state',
      label: `State: ${stateParam}`,
      onRemove: () => updateQueryParam('state', null),
    });
  }
  if (districtParam) {
    activeChips.push({
      key: 'district',
      label: `District: ${districtParam}`,
      onRemove: () => updateQueryParam('district', null),
    });
  }
  if (ageRangeParam) {
    activeChips.push({
      key: 'age',
      label: `Age: ${ageRangeParam.replace('_', ' / ')}`,
      onRemove: () => updateQueryParam('age', null),
    });
  }
  if (genderParam) {
    activeChips.push({
      key: 'gender',
      label: `Gender: ${genderParam}`,
      onRemove: () => updateQueryParam('gender', null),
    });
  }
  if (sizeParam) {
    activeChips.push({
      key: 'size',
      label: `Size: ${sizeParam}`,
      onRemove: () => updateQueryParam('size', null),
    });
  }
  if (vaccinatedParam) {
    activeChips.push({
      key: 'vaccinated',
      label: vaccinatedParam === 'true' ? 'Vaccinated Only' : 'Unvaccinated',
      onRemove: () => updateQueryParam('vaccinated', null),
    });
  }
  if (queryParam) {
    activeChips.push({
      key: 'q',
      label: `Search: "${queryParam}"`,
      onRemove: () => {
        setSearchInput('');
        updateQueryParam('q', null);
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      {/* Anti-Scam / Zero-Fee Warning Banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-950">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            <strong>Safety Notice:</strong> Never pay money upfront for an adoption. Selling or trading animals is strictly prohibited on Pawfect.
          </span>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b border-[#E7DEDF] bg-[#FAF7F2] py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full bg-[#F3E3E8] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#7B1E3A]">
                Pawfect Adoption Portal · Tamil Nadu &amp; Kerala
              </span>
              <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#231A1D] sm:text-4xl lg:text-5xl">
                {viewTab === 'happy-tails'
                  ? 'Happy Tails — Adopted Companions.'
                  : 'Find Your Forever Companion.'}
              </h1>
              <p className="mt-3 text-base sm:text-lg text-[#6B5B61]">
                {viewTab === 'happy-tails'
                  ? 'Celebrating rescue animals who found loving homes through real community listings.'
                  : 'Browse real, admin-reviewed companion listings from individual rescuers and verified shelters.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to={listAnimalTarget}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[#7B1E3A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5E1730]"
              >
                <Plus className="h-4 w-4" /> List an animal
              </Link>
              {user?.emailVerified && (
                <Link
                  to={ROUTES.MY_LISTINGS}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-[#E7DEDF] bg-white px-4 py-3 text-xs font-semibold text-[#231A1D] hover:border-[#7B1E3A]"
                >
                  My Listings
                </Link>
              )}
            </div>
          </div>

          {/* Available vs Happy Tails Toggle */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => updateQueryParam('tab', null)}
              className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                viewTab === 'available'
                  ? 'bg-[#7B1E3A] text-white'
                  : 'border border-[#E7DEDF] bg-white text-[#6B5B61] hover:text-[#231A1D]'
              }`}
            >
              Available for Adoption
            </button>
            <button
              type="button"
              onClick={() => updateQueryParam('tab', 'happy-tails')}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                viewTab === 'happy-tails'
                  ? 'bg-emerald-700 text-white'
                  : 'border border-[#E7DEDF] bg-white text-[#6B5B61] hover:text-[#231A1D]'
              }`}
            >
              <HeartHandshake className="h-3.5 w-3.5" /> Happy Tails
            </button>
          </div>

          {/* Search Bar & Primary Filters */}
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B5B61]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, breed, city, district, or shelter..."
                className="w-full rounded-2xl border border-[#E7DEDF] bg-white py-3.5 pl-12 pr-10 text-sm text-[#231A1D] shadow-xs placeholder:text-[#6B5B61]/60 focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateQueryParam('q', null);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B5B61] hover:text-[#231A1D]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Species Quick Tabs */}
              <div className="flex items-center gap-1 rounded-2xl border border-[#E7DEDF] bg-white p-1">
                {(['all', ...LISTING_SPECIES] as const).map((sp) => {
                  const isActive = (sp === 'all' && !speciesParam) || speciesParam === sp;
                  return (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => updateQueryParam('species', sp === 'all' ? null : sp)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                        isActive
                          ? 'bg-[#7B1E3A] text-white'
                          : 'text-[#6B5B61] hover:text-[#231A1D]'
                      }`}
                    >
                      {sp === 'all' ? 'All' : sp === 'other' ? 'Other' : `${sp}s`}
                    </button>
                  );
                })}
              </div>

              {/* State Selector */}
              <div className="relative">
                <select
                  value={stateParam}
                  onChange={(e) => updateQueryParam('state', e.target.value || null)}
                  aria-label="Filter by state"
                  className="appearance-none rounded-2xl border border-[#E7DEDF] bg-white py-3.5 pl-4 pr-9 text-xs font-medium text-[#231A1D] shadow-xs focus:border-[#7B1E3A] focus:outline-none"
                >
                  <option value="">All States (TN &amp; KL)</option>
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B5B61]" />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortParam}
                  onChange={(e) => updateQueryParam('sort', e.target.value)}
                  aria-label="Sort listings"
                  className="appearance-none rounded-2xl border border-[#E7DEDF] bg-white py-3.5 pl-4 pr-9 text-xs font-medium text-[#231A1D] shadow-xs focus:border-[#7B1E3A] focus:outline-none"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="youngest">Sort: Youngest</option>
                  <option value="oldest">Sort: Oldest</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B5B61]" />
              </div>

              {/* More Filters Drawer Button */}
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className="relative flex items-center gap-2 rounded-2xl border border-[#E7DEDF] bg-white px-4 py-3.5 text-xs font-semibold text-[#231A1D] shadow-xs hover:border-[#7B1E3A] hover:text-[#7B1E3A]"
              >
                <SlidersHorizontal className="h-4 w-4 text-[#7B1E3A]" />
                <span>Filters</span>
                {activeChips.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7B1E3A] text-[10px] font-bold text-white">
                    {activeChips.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Chips */}
          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#6B5B61]">Active filters:</span>
              {activeChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DEDF] bg-white px-3 py-1 text-xs font-medium text-[#231A1D]"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="text-[#6B5B61] hover:text-[#7B1E3A]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-[#7B1E3A] hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={executeQuery}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-800"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-[#E7DEDF] bg-white p-4"
              >
                <div className="aspect-4/3 w-full rounded-xl bg-gray-200" />
                <div className="mt-4 h-5 w-3/4 rounded-md bg-gray-200" />
                <div className="mt-2 h-4 w-1/2 rounded-md bg-gray-200" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E7DEDF] bg-white p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF7F2] text-[#7B1E3A]">
              <PawPrint className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-[#231A1D]">
              {activeChips.length > 0
                ? 'No matching listings found'
                : viewTab === 'happy-tails'
                ? 'No Happy Tails shared yet'
                : 'No animals currently listed'}
            </h2>
            <p className="mt-2 max-w-md text-sm text-[#6B5B61]">
              {activeChips.length > 0
                ? 'Try clearing or widening your filters to see other available companions across Tamil Nadu and Kerala.'
                : 'Pawfect only shows real user- and shelter-created listings once approved. Rescuing an animal? Help them find a safe forever home.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E7DEDF] bg-white px-5 py-2.5 text-sm font-semibold text-[#231A1D]"
                >
                  <RotateCcw className="h-4 w-4" /> Reset Filters
                </button>
              )}
              <Link
                to={listAnimalTarget}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7B1E3A] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#5E1730]"
              >
                <Plus className="h-4 w-4" /> List an animal
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-xs text-[#6B5B61]">
              Showing {listings.length}{' '}
              {viewTab === 'happy-tails' ? 'adopted happy tails' : 'approved companions'}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {listings.map((item) => (
                <PetCard
                  key={item.id}
                  listing={item}
                  isFavorited={favoriteIds.includes(item.id)}
                  onFavoriteToggled={(id, isFav) => {
                    setFavoriteIds((prev) =>
                      isFav ? [...prev, id] : prev.filter((f) => f !== id)
                    );
                  }}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#E7DEDF] bg-white px-8 py-3 text-sm font-semibold text-[#7B1E3A] shadow-xs hover:border-[#7B1E3A] disabled:opacity-50"
                >
                  {isLoadingMore ? 'Loading more...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Slide-over Filter Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7DEDF] px-6 py-4">
              <h2 className="font-serif text-lg font-bold text-[#231A1D]">Refine Search</h2>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="text-[#6B5B61] hover:text-[#231A1D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* State & District */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B5B61]">
                  State &amp; District
                </label>
                <select
                  value={stateParam}
                  onChange={(e) => updateQueryParam('state', e.target.value || null)}
                  className="w-full rounded-xl border border-[#E7DEDF] p-3 text-xs text-[#231A1D]"
                >
                  <option value="">All Enabled States (TN &amp; KL)</option>
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <select
                  value={districtParam}
                  disabled={!stateParam}
                  onChange={(e) => updateQueryParam('district', e.target.value || null)}
                  className="w-full rounded-xl border border-[#E7DEDF] p-3 text-xs text-[#231A1D] disabled:opacity-50"
                >
                  <option value="">
                    {stateParam ? 'All Districts' : 'Select a state first'}
                  </option>
                  {availableDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* Age Range */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B5B61]">
                  Age Stage
                </label>
                <div className="mt-2 space-y-2">
                  {[
                    { id: 'puppy_kitten', label: 'Puppy / Kitten (< 1 year)' },
                    { id: 'young', label: 'Young (1 – 3 years)' },
                    { id: 'adult', label: 'Adult (3 – 8 years)' },
                    { id: 'senior', label: 'Senior (8+ years)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        updateQueryParam(
                          'age',
                          ageRangeParam === item.id ? null : item.id
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs font-medium ${
                        ageRangeParam === item.id
                          ? 'border-[#7B1E3A] bg-[#F3E3E8]/50 text-[#7B1E3A] font-semibold'
                          : 'border-[#E7DEDF] text-[#231A1D]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {ageRangeParam === item.id && <Check className="h-4 w-4 text-[#7B1E3A]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B5B61]">
                  Gender
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(['male', 'female', 'unknown'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => updateQueryParam('gender', genderParam === g ? null : g)}
                      className={`rounded-xl border p-2.5 text-xs font-semibold capitalize ${
                        genderParam === g
                          ? 'border-[#7B1E3A] bg-[#F3E3E8]/50 text-[#7B1E3A]'
                          : 'border-[#E7DEDF] text-[#6B5B61]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B5B61]">
                  Size
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateQueryParam('size', sizeParam === s ? null : s)}
                      className={`rounded-xl border p-2 text-xs font-semibold capitalize ${
                        sizeParam === s
                          ? 'border-[#7B1E3A] bg-[#F3E3E8]/50 text-[#7B1E3A]'
                          : 'border-[#E7DEDF] text-[#6B5B61]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vaccinated */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vaccinatedParam === 'true'}
                  onChange={(e) =>
                    updateQueryParam('vaccinated', e.target.checked ? 'true' : null)
                  }
                  className="h-4 w-4 rounded-sm border-[#E7DEDF] text-[#7B1E3A]"
                />
                <span className="text-xs font-medium text-[#231A1D]">
                  Only show vaccinated animals
                </span>
              </label>
            </div>

            <div className="border-t border-[#E7DEDF] p-4 flex gap-3">
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex-1 rounded-xl border border-[#E7DEDF] py-2.5 text-xs font-semibold text-[#6B5B61]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 rounded-xl bg-[#7B1E3A] py-2.5 text-xs font-semibold text-white"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
