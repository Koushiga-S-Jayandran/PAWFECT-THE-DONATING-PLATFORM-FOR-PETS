import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { getAllGifts, type GiftCatalogItem, type GiftCategory } from '../../config/giftCatalog.js';
import { formatRupees } from '../../utils/money.js';
import { shelterBrowseService } from '../../app/container.js';
import type { Shelter } from '../../domain/shelterEntities.js';
import {
  Gift,
  Heart,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Building2,
  Utensils,
  Stethoscope,
  Shield,
  Calendar,
  IndianRupee,
} from 'lucide-react';

const CATEGORIES: { id: 'ALL' | GiftCategory; label: string; icon: React.ElementType }[] = [
  { id: 'ALL', label: 'All Gifts (14)', icon: Sparkles },
  { id: 'MEALS', label: 'Meals & Food', icon: Utensils },
  { id: 'HEALTHCARE', label: 'Medical & Care', icon: Stethoscope },
  { id: 'SAFETY', label: 'Safety & Collars', icon: Shield },
  { id: 'SPONSORSHIP', label: 'Sponsorships', icon: Heart },
  { id: 'CELEBRATION', label: 'Occasions & Memory', icon: Calendar },
  { id: 'CUSTOM', label: 'Custom Contribution', icon: IndianRupee },
];

export const GiftPickerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const targetShelterId = searchParams.get('shelterId');

  const [selectedCategory, setSelectedCategory] = useState<'ALL' | GiftCategory>('ALL');
  const [targetShelter, setTargetShelter] = useState<Shelter | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (targetShelterId) {
      shelterBrowseService
        .getShelterDetails(targetShelterId)
        .then((s) => setTargetShelter(s))
        .catch(() => {});
    }
  }, [targetShelterId]);

  const allGifts = getAllGifts();
  const filteredGifts =
    selectedCategory === 'ALL'
      ? allGifts
      : allGifts.filter((g) => g.category === selectedCategory);

  const handleImageError = (giftId: string) => {
    setImageErrors((prev) => ({ ...prev, [giftId]: true }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1 pb-20">
        {/* Banner Section */}
        <section className="border-b border-[#E7DEDF] bg-white py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F3E3E8] px-3.5 py-1 text-xs font-semibold text-[#7B1E3A]">
              <Gift className="h-3.5 w-3.5" />
              <span>100% Direct Giving • 0% Platform Fee</span>
            </div>

            <h1 className="font-heading text-3xl font-medium tracking-tight text-[#231A1D] sm:text-5xl">
              Choose a gift for shelter paws
            </h1>

            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[#6B5B61] sm:text-base">
              Every single gift directly feeds, heals, and protects rescue dogs and cats in verified shelters across Tamil Nadu and Kerala. Your money goes straight to the shelter via UPI.
            </p>

            {targetShelter && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#7B1E3A]/20 bg-[#F3E3E8]/50 px-4 py-2 text-xs font-medium text-[#7B1E3A]">
                <Building2 className="h-4 w-4" />
                <span>
                  Giving to: <strong>{targetShelter.name}</strong> ({targetShelter.area}, {targetShelter.district})
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Category Tabs */}
        <div className="sticky top-0 z-10 border-b border-[#E7DEDF] bg-[#FAF7F2]/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto py-3 gap-2 no-scrollbar">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-2 shrink-0 rounded-xl px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#7B1E3A] text-white shadow-xs'
                        : 'border border-[#E7DEDF] bg-white text-[#6B5B61] hover:border-[#7B1E3A]/40 hover:text-[#231A1D]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gift Grid */}
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredGifts.map((gift) => {
              const donateUrl = targetShelterId
                ? `/donate/${gift.id}?shelterId=${targetShelterId}`
                : `/donate/${gift.id}`;

              const isImageBroken = imageErrors[gift.id];

              return (
                <Card
                  key={gift.id}
                  padding="none"
                  className="flex flex-col overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200 border border-[#E7DEDF] text-left"
                >
                  {/* Photo Container with Mandatory Illustrative Tag */}
                  <div className="relative aspect-3/2 w-full overflow-hidden bg-[#EAE2E3]">
                    {!isImageBroken ? (
                      <img
                        src={gift.imagePath}
                        alt={gift.imageAlt}
                        onError={() => handleImageError(gift.id)}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-102"
                        loading="lazy"
                      />
                    ) : (
                      /* Neutral fallback block */
                      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-[#F3E3E8]/40 text-[#7B1E3A]">
                        <Gift className="h-10 w-10 opacity-70 mb-1" />
                        <span className="text-[11px] font-medium">{gift.name}</span>
                      </div>
                    )}

                    {/* Small mandatory illustrative tag */}
                    <span className="absolute bottom-2 right-2 rounded bg-[#231A1D]/75 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white backdrop-blur-xs">
                      Illustrative image
                    </span>

                    {/* Price Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center rounded-xl bg-white/95 px-2.5 py-1 text-xs font-bold text-[#7B1E3A] shadow-xs backdrop-blur-xs">
                        {gift.isCustom ? 'Custom Amount' : formatRupees(gift.unitPricePaise)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                    <div className="space-y-2">
                      <h2 className="font-heading text-lg font-medium text-[#231A1D] line-clamp-1">
                        {gift.name}
                      </h2>
                      <p className="text-xs leading-relaxed text-[#6B5B61] line-clamp-2">
                        {gift.caption}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E7DEDF]/60">
                      <p className="text-[11px] text-[#2E7D5B] font-medium flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>Direct delivery with photo proof</span>
                      </p>

                      <div className="mt-3">
                        <Link to={donateUrl}>
                          <Button variant="primary" size="md" className="w-full justify-center gap-1.5 text-xs font-semibold">
                            <span>Send this gift</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
