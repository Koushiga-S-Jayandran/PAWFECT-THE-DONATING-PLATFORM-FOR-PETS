import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { Input } from '../../ui/components/Input.js';
import { getGiftById } from '../../config/giftCatalog.js';
import { DONATION_CONFIG } from '../../config/donationConfig.js';
import { formatRupees, rupeesToPaise } from '../../utils/money.js';
import { shelterBrowseService } from '../../app/container.js';
import type { Shelter } from '../../domain/shelterEntities.js';
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  Heart,
  Building2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export const GiftDetailsPage: React.FC = () => {
  const { giftId } = useParams<{ giftId: string }>();
  const [searchParams] = useSearchParams();
  const preSelectedShelterId = searchParams.get('shelterId');
  const navigate = useNavigate();

  const gift = getGiftById(giftId || '');

  // Form State
  const [quantity, setQuantity] = useState<number>(gift?.minQuantity || 1);
  const [customRupees, setCustomRupees] = useState<string>('500');
  const [selectedShelterId, setSelectedShelterId] = useState<string>(preSelectedShelterId || '');
  const [shelters, setShelters] = useState<readonly Shelter[]>([]);
  const [isLoadingShelters, setIsLoadingShelters] = useState(true);

  // Dedication & notes
  const [hasDedication, setHasDedication] = useState(false);
  const [dedicationType, setDedicationType] = useState<'HONOR' | 'MEMORY'>('HONOR');
  const [dedicationName, setDedicationName] = useState('');
  const [dedicationMessage, setDedicationMessage] = useState('');
  const [donorNote, setDonorNote] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Load verified shelters
  useEffect(() => {
    shelterBrowseService
      .getApprovedShelters()
      .then((res) => {
        setShelters(res.items);
        if (!selectedShelterId && res.items.length > 0) {
          // If no shelter preselected, pick first approved
          setSelectedShelterId(res.items[0].ownerId);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingShelters(false));
  }, []);

  if (!gift) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <Card padding="lg" className="max-w-md text-center space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-[#B4423A]" />
            <h1 className="font-heading text-2xl font-medium">Gift Not Found</h1>
            <p className="text-xs text-[#6B5B61]">The gift you selected does not exist in our catalog.</p>
            <Link to="/gifts">
              <Button variant="primary" size="md">Browse All Gifts</Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate total amount in paise
  let totalAmountPaise = 0;
  if (gift.isCustom) {
    const num = parseFloat(customRupees) || 0;
    totalAmountPaise = rupeesToPaise(num);
  } else {
    totalAmountPaise = quantity * gift.unitPricePaise;
  }

  const selectedShelter = shelters.find((s) => s.ownerId === selectedShelterId);

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedShelterId) {
      setFormError('Please select a verified shelter to receive your gift.');
      return;
    }

    if (gift.isCustom) {
      const val = parseFloat(customRupees);
      if (isNaN(val) || val < 50) {
        setFormError('Minimum custom contribution is ₹50.');
        return;
      }
      if (val > 100000) {
        setFormError('Maximum contribution is ₹1,00,000.');
        return;
      }
    } else {
      if (quantity < gift.minQuantity || quantity > gift.maxQuantity) {
        setFormError(`Quantity must be between ${gift.minQuantity} and ${gift.maxQuantity}.`);
        return;
      }
    }

    // Save pending gift draft to session storage for review
    const draft = {
      giftId: gift.id,
      giftName: gift.name,
      quantity: gift.isCustom ? 1 : quantity,
      unitPricePaise: gift.isCustom ? totalAmountPaise : gift.unitPricePaise,
      totalAmountPaise,
      customAmountRupees: gift.isCustom ? parseFloat(customRupees) : undefined,
      shelterId: selectedShelterId,
      shelterName: selectedShelter?.name || '',
      shelterState: selectedShelter?.stateCode || '',
      shelterDistrict: selectedShelter?.district || '',
      donorNote: donorNote.trim(),
      dedicationName: hasDedication ? dedicationName.trim() : undefined,
      dedicationMessage: hasDedication ? dedicationMessage.trim() : undefined,
    };

    sessionStorage.setItem('pawfect_donation_draft', JSON.stringify(draft));
    navigate('/donate/review');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="border-b border-[#E7DEDF] bg-white py-4">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <Link
              to="/gifts"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B5B61] hover:text-[#231A1D]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Gift Catalog</span>
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
          <form onSubmit={handleProceed} className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left Column: Gift Photo & Details */}
            <div className="lg:col-span-5 space-y-6">
              <Card padding="none" className="overflow-hidden shadow-xs border border-[#E7DEDF] text-left">
                <div className="relative aspect-3/2 w-full overflow-hidden bg-[#EAE2E3]">
                  <img
                    src={gift.imagePath}
                    alt={gift.imageAlt}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 rounded bg-[#231A1D]/75 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white backdrop-blur-xs">
                    Illustrative image
                  </span>
                  <div className="absolute top-2.5 left-2.5">
                    <span className="inline-flex items-center rounded-xl bg-white/95 px-2.5 py-1 text-xs font-bold text-[#7B1E3A] shadow-xs">
                      {gift.isCustom ? 'Custom Amount' : formatRupees(gift.unitPricePaise)}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h1 className="font-heading text-2xl font-medium text-[#231A1D]">
                    {gift.name}
                  </h1>
                  <p className="text-xs leading-relaxed text-[#6B5B61]">
                    {gift.caption}
                  </p>

                  <div className="pt-3 border-t border-[#E7DEDF] space-y-2 text-xs text-[#2E7D5B] font-medium">
                    <p className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{gift.impactDescription}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-[#7B1E3A]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Direct UPI payment • Zero platform fee</span>
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Gift Configuration & Shelter Choice */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {formError && (
                <div role="alert" className="rounded-xl border border-[#B4423A]/30 bg-[#B4423A]/10 p-4 text-xs font-medium text-[#B4423A] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step 1: Select Quantity or Amount */}
              <Card padding="md" className="shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-[#231A1D] flex items-center gap-2">
                  <span>1. Choose Quantity or Amount</span>
                </h2>

                {gift.isCustom ? (
                  <div className="space-y-2">
                    <label htmlFor="custom-rupees" className="block text-xs font-medium text-[#6B5B61]">
                      Enter amount in Rupees (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#7B1E3A]">
                        ₹
                      </span>
                      <input
                        id="custom-rupees"
                        type="number"
                        min="50"
                        max="100000"
                        step="10"
                        value={customRupees}
                        onChange={(e) => setCustomRupees(e.target.value)}
                        className="w-full rounded-xl border border-[#E7DEDF] bg-white py-2.5 pl-8 pr-4 text-sm font-semibold text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      {[100, 250, 500, 1000, 2500].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCustomRupees(preset.toString())}
                          className="rounded-lg border border-[#E7DEDF] bg-[#FAF7F2] px-2.5 py-1 text-xs font-medium text-[#231A1D] hover:border-[#7B1E3A] hover:bg-white"
                        >
                          ₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border rounded-xl border-[#E7DEDF] p-4 bg-[#FAF7F2]">
                    <div>
                      <span className="text-xs text-[#6B5B61] block">Number of gifts</span>
                      <span className="text-sm font-bold text-[#231A1D]">
                        {quantity} × {formatRupees(gift.unitPricePaise)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(gift.minQuantity, q - 1))}
                        disabled={quantity <= gift.minQuantity}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7DEDF] bg-white text-[#231A1D] hover:bg-[#F3E3E8] disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <span className="min-w-6 text-center font-bold text-base text-[#231A1D]">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(gift.maxQuantity, q + 1))}
                        disabled={quantity >= gift.maxQuantity}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7DEDF] bg-white text-[#231A1D] hover:bg-[#F3E3E8] disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Total Preview */}
                <div className="flex items-center justify-between border-t border-[#E7DEDF] pt-3 text-sm">
                  <span className="font-medium text-[#6B5B61]">Total Gift Value:</span>
                  <span className="font-heading text-xl font-bold text-[#7B1E3A]">
                    {formatRupees(totalAmountPaise)}
                  </span>
                </div>
              </Card>

              {/* Step 2: Choose Shelter */}
              <Card padding="md" className="shadow-xs space-y-3">
                <h2 className="text-sm font-semibold text-[#231A1D] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#7B1E3A]" />
                  <span>2. Select Receiving Shelter (Tamil Nadu & Kerala)</span>
                </h2>

                {isLoadingShelters ? (
                  <p className="text-xs text-[#6B5B61]">Loading verified shelters...</p>
                ) : shelters.length === 0 ? (
                  <p className="text-xs text-[#6B5B61]">No verified shelters currently listed.</p>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="shelter-select" className="sr-only">
                      Select verified shelter
                    </label>
                    <select
                      id="shelter-select"
                      value={selectedShelterId}
                      onChange={(e) => setSelectedShelterId(e.target.value)}
                      className="w-full rounded-xl border border-[#E7DEDF] bg-white p-3 text-xs font-medium text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none"
                    >
                      {shelters.map((s) => (
                        <option key={s.ownerId} value={s.ownerId}>
                          {s.name} ({s.area}, {s.district})
                        </option>
                      ))}
                    </select>

                    {selectedShelter && (
                      <div className="rounded-xl bg-[#FAF7F2] p-3 text-xs text-[#6B5B61] flex items-center justify-between">
                        <span>{selectedShelter.description.slice(0, 80)}...</span>
                        <Badge variant="success" className="py-0.5 px-2 text-[10px]">
                          Verified
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Step 3: Dedication & Donor Note (Optional) */}
              <Card padding="md" className="shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#231A1D] flex items-center gap-2">
                    <Heart className="h-4 w-4 text-[#7B1E3A]" />
                    <span>3. Dedication & Note (Optional)</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setHasDedication(!hasDedication)}
                    className="text-xs font-semibold text-[#7B1E3A] hover:underline cursor-pointer"
                  >
                    {hasDedication ? 'Remove Dedication' : '+ Add Dedication'}
                  </button>
                </div>

                {hasDedication && (
                  <div className="space-y-3 rounded-xl bg-[#FAF7F2] p-3.5 border border-[#E7DEDF]">
                    <div className="flex gap-4 text-xs font-medium">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="dedicationType"
                          checked={dedicationType === 'HONOR'}
                          onChange={() => setDedicationType('HONOR')}
                          className="text-[#7B1E3A]"
                        />
                        <span>In Honor of (Living Pet or Person)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="dedicationType"
                          checked={dedicationType === 'MEMORY'}
                          onChange={() => setDedicationType('MEMORY')}
                          className="text-[#7B1E3A]"
                        />
                        <span>In Loving Memory</span>
                      </label>
                    </div>

                    <Input
                      label="Honoree Name"
                      value={dedicationName}
                      onChange={(e) => setDedicationName(e.target.value)}
                      placeholder="e.g. Bruno or Dr. Sundaram"
                    />

                    <div>
                      <label className="block text-xs font-medium text-[#6B5B61] mb-1">
                        Personal Dedication Message
                      </label>
                      <textarea
                        rows={2}
                        value={dedicationMessage}
                        onChange={(e) => setDedicationMessage(e.target.value)}
                        placeholder="A short message of remembrance or celebration..."
                        className="w-full rounded-xl border border-[#E7DEDF] bg-white p-2.5 text-xs text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="donor-note" className="block text-xs font-medium text-[#6B5B61] mb-1">
                    Special Note for Shelter Caretakers (Max 140 chars)
                  </label>
                  <input
                    id="donor-note"
                    type="text"
                    maxLength={140}
                    value={donorNote}
                    onChange={(e) => setDonorNote(e.target.value)}
                    placeholder="e.g. Please give extra cuddles to the senior dogs!"
                    className="w-full rounded-xl border border-[#E7DEDF] bg-white p-2.5 text-xs text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none"
                  />
                </div>
              </Card>

              {/* Submit Button */}
              <div className="pt-2">
                <Button type="submit" variant="primary" size="lg" className="w-full justify-center gap-2 font-semibold">
                  <span>Continue to Review</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="mt-2 text-center text-[11px] text-[#6B5B61]">
                  You will review all gift details and shelter verification before making payment.
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};
