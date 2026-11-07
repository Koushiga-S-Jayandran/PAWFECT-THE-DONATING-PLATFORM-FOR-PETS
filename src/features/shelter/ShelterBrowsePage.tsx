import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { shelterBrowseService } from '../../app/container.js';
import type { Shelter } from '../../domain/shelterEntities.js';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { Input } from '../../ui/components/Input.js';
import { REGIONS, getRegionByCode } from '../../config/regions.js';
import { ANIMAL_TYPES, getAnimalTypeLabel } from '../../config/animalTypes.js';
import { URGENCY_LEVELS } from '../../config/urgencyLevels.js';
import { SHELTER_ROUTES } from '../../config/shelterRoutes.js';
import {
  Search,
  Filter,
  CheckCircle2,
  Building2,
  ArrowRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export const ShelterBrowsePage: React.FC = () => {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [selectedAnimalTypes, setSelectedAnimalTypes] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const fetchShelters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await shelterBrowseService.getApprovedShelters({
        searchQuery,
        district: selectedDistrict || undefined,
        urgency: selectedUrgency || undefined,
        animalTypes: selectedAnimalTypes.length > 0 ? selectedAnimalTypes : undefined,
        verifiedOnly: verifiedOnly || undefined,
      });
      setShelters(res.items);
      setVisibleCount(ITEMS_PER_PAGE);
    } catch (err: any) {
      setError('Unable to load shelters at this moment. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, [searchQuery, selectedDistrict, selectedUrgency, selectedAnimalTypes, verifiedOnly]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDistrict('');
    setSelectedUrgency('');
    setSelectedAnimalTypes([]);
    setVerifiedOnly(false);
  };

  const handleAnimalTypeToggle = (typeId: string) => {
    if (selectedAnimalTypes.includes(typeId)) {
      setSelectedAnimalTypes(selectedAnimalTypes.filter((t) => t !== typeId));
    } else {
      setSelectedAnimalTypes([...selectedAnimalTypes, typeId]);
    }
  };

  const isFiltered = Boolean(
    searchQuery ||
    selectedDistrict ||
    selectedUrgency ||
    selectedAnimalTypes.length > 0 ||
    verifiedOnly
  );

  const visibleShelters = useMemo(() => {
    return shelters.slice(0, visibleCount);
  }, [shelters, visibleCount]);

  const hasMore = visibleCount < shelters.length;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1 pb-16">
        {/* Hero Banner */}
        <section className="border-b border-[#E7DEDF] bg-white py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl text-left">
              <Badge variant="accent" className="mb-3">
                Tamil Nadu & Kerala
              </Badge>
              <h1 className="font-heading text-3xl font-medium tracking-tight text-[#231A1D] sm:text-4xl">
                Browse verified animal shelters
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#6B5B61] sm:text-base">
                Discover registered shelters providing food, shelter, and medical emergency rescue.
                All gifts are paid directly to shelter UPI handles.
              </p>
            </div>
          </div>
        </section>

        {/* Sticky Filter Bar */}
        <section className="sticky top-18 z-30 border-b border-[#E7DEDF] bg-[#FFFFFF]/95 py-4 backdrop-blur-md transition-colors duration-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5B61]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shelter by name or locality..."
                  className="min-h-[44px] w-full rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] pl-10 pr-4 text-xs text-[#231A1D] placeholder:text-[#6B5B61]/70 focus:border-[#7B1E3A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                />
              </div>

              {/* District & Urgency Selectors */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* District Grouped Dropdown */}
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="min-h-[44px] rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] px-3 py-2 text-xs font-medium text-[#231A1D] focus:border-[#7B1E3A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                  aria-label="Filter by district"
                >
                  <option value="">All Districts</option>
                  {REGIONS.filter((r) => r.enabled).map((region) => (
                    <optgroup key={region.code} label={region.name}>
                      {region.districts.map((district) => (
                        <option key={district} value={district}>
                          {district} ({region.code})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Urgency Dropdown */}
                <select
                  value={selectedUrgency}
                  onChange={(e) => setSelectedUrgency(e.target.value)}
                  className="min-h-[44px] rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] px-3 py-2 text-xs font-medium text-[#231A1D] focus:border-[#7B1E3A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                  aria-label="Filter by urgency"
                >
                  <option value="">All Urgencies</option>
                  {URGENCY_LEVELS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>

                {/* Verified Toggle */}
                <label className="min-h-[44px] flex items-center gap-2 rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] px-3.5 py-2 text-xs font-medium text-[#231A1D] cursor-pointer hover:bg-white">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-[#E7DEDF] text-[#7B1E3A] focus:ring-[#7B1E3A]"
                  />
                  <span>Verified Only</span>
                </label>

                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#7B1E3A] hover:text-[#5E1730] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded-xl"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Clear filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Animal Type Filter Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E7DEDF]/50">
              <span className="text-[11px] font-semibold text-[#6B5B61] mr-1">
                Filter Animals:
              </span>
              {ANIMAL_TYPES.map((type) => {
                const isSelected = selectedAnimalTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleAnimalTypeToggle(type.id)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[#7B1E3A] text-white shadow-xs'
                        : 'border border-[#E7DEDF] bg-white text-[#6B5B61] hover:border-[#7B1E3A]/40'
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Shelter Grid Section */}
        <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          {/* Result Count */}
          <div className="mb-6 flex items-center justify-between text-xs text-[#6B5B61]">
            <span>
              Showing <strong className="text-[#231A1D]">{shelters.length}</strong>{' '}
              {shelters.length === 1 ? 'verified shelter' : 'verified shelters'}
            </span>
            <Link
              to={SHELTER_ROUTES.REGISTER}
              className="font-medium text-[#7B1E3A] hover:underline"
            >
              Are you a shelter? Register here &rarr;
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-80 animate-pulse rounded-2xl border border-[#E7DEDF] bg-white p-5"
                >
                  <div className="h-40 w-full rounded-xl bg-[#FAF7F2]" />
                  <div className="mt-4 h-5 w-3/4 rounded bg-[#FAF7F2]" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-[#FAF7F2]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-[#B4423A]/20 bg-[#B4423A]/10 p-8 text-center text-xs text-[#B4423A] space-y-3"
            >
              <AlertCircle className="mx-auto h-8 w-8 text-[#B4423A]" />
              <p className="text-sm font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchShelters}>
                Retry
              </Button>
            </div>
          ) : shelters.length === 0 ? (
            /* Clear Empty States */
            <div className="rounded-2xl border border-[#E7DEDF] bg-white p-12 text-center shadow-xs">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E3E8] text-[#7B1E3A]">
                <Building2 className="h-7 w-7" aria-hidden="true" />
              </div>
              {isFiltered ? (
                <div className="space-y-3">
                  <h3 className="font-heading text-xl font-medium text-[#231A1D]">
                    No shelters match your filters
                  </h3>
                  <p className="text-xs text-[#6B5B61] max-w-sm mx-auto">
                    Try relaxing your district, animal type, or search query to see more results.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-heading text-xl font-medium text-[#231A1D]">
                    Shelters in Tamil Nadu and Kerala are joining soon
                  </h3>
                  <p className="text-xs text-[#6B5B61] max-w-sm mx-auto">
                    We are currently verifying initial shelters across India. Shelter representatives can submit registrations for review.
                  </p>
                  <Link to={SHELTER_ROUTES.REGISTER}>
                    <Button variant="primary" size="md" className="mt-2">
                      Register your shelter
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Responsive Grid: 1 / 2 / 3 columns */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleShelters.map((shelter, idx) => {
                  const region = getRegionByCode(shelter.stateCode);
                  return (
                    <Card
                      key={shelter.ownerId}
                      padding="none"
                      className="group flex flex-col overflow-hidden text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-in fade-in"
                      style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
                    >
                      {/* Illustrative Image Placeholder with burgundy paw logo */}
                      <div className="relative aspect-16/10 w-full overflow-hidden border-b border-[#E7DEDF] bg-[#FAF7F2] flex items-center justify-center p-6">
                        <img
                          src="/assets/aistudio/pawfect_logo_transparent_9c2be9aa.png"
                          alt="Pawfect shelter illustration"
                          className="h-16 w-auto object-contain opacity-75 transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute right-2.5 bottom-2.5 rounded bg-[#231A1D]/75 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white backdrop-blur-xs">
                          Illustrative image
                        </div>

                        {/* Urgency Badge */}
                        <div className="absolute left-2.5 top-2.5">
                          {shelter.urgency === 'NORMAL' && (
                            <Badge variant="neutral" className="py-0.5 px-2 text-[10px]">
                              Normal care
                            </Badge>
                          )}
                          {shelter.urgency === 'URGENT' && (
                            <Badge variant="warning" className="py-0.5 px-2 text-[10px]">
                              Urgent need
                            </Badge>
                          )}
                          {shelter.urgency === 'CRITICAL' && (
                            <Badge variant="primary" className="py-0.5 px-2 text-[10px] bg-[#B4423A] text-white">
                              Critical emergency
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col justify-between p-5">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-xs font-medium text-[#6B5B61]">
                              {shelter.area}, {shelter.district}, {region?.name}
                            </span>
                            {shelter.verified && (
                              <CheckCircle2
                                className="h-3.5 w-3.5 text-[#2E7D5B] shrink-0"
                                aria-label="Verified shelter"
                              />
                            )}
                          </div>

                          <h3 className="font-heading text-lg font-medium text-[#231A1D] group-hover:text-[#7B1E3A] transition-colors">
                            {shelter.name}
                          </h3>

                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6B5B61]">
                            {shelter.description}
                          </p>

                          {/* Animal Type Chips */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {shelter.animalTypes.map((type) => (
                              <span
                                key={type}
                                className="rounded-md bg-[#FAF7F2] border border-[#E7DEDF] px-2 py-0.5 text-[10px] font-medium text-[#6B5B61]"
                              >
                                {getAnimalTypeLabel(type)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Link */}
                        <div className="mt-5 border-t border-[#E7DEDF]/70 pt-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#7B1E3A] group-hover:underline inline-flex items-center gap-1">
                            <span>View shelter</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>

                          <span className="text-[10px] text-[#6B5B61]">
                            Direct UPI
                          </span>
                        </div>
                      </div>

                      {/* Clickable Card Link covering entire item */}
                      <Link
                        to={`/shelters/${shelter.ownerId}`}
                        className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A] rounded-2xl"
                        aria-label={`View details for ${shelter.name}`}
                      />
                    </Card>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                  >
                    Load more shelters
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};
