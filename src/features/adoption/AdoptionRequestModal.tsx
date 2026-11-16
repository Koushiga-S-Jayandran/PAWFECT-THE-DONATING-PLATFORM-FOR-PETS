import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Heart,
  Home,
  User,
  ShieldCheck,
} from 'lucide-react';
import type { Pet, HousingType } from '../../domain/petEntities.js';
import { useAuth } from '../../context/AuthContext.js';
import { petAdoptionService } from '../../services/PetAdoptionService.js';
import { ROUTES } from '../../config/constants.js';

interface AdoptionRequestModalProps {
  pet: Pet;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdoptionRequestModal: React.FC<AdoptionRequestModalProps> = ({
  pet,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const [housingType, setHousingType] = useState<HousingType>('own_apartment');
  const [ownsHome, setOwnsHome] = useState<boolean>(true);
  const [landlordPermission, setLandlordPermission] = useState<boolean>(true);
  const [hasYard, setHasYard] = useState<boolean>(false);

  const [experience, setExperience] = useState<string>('intermediate');
  const [hasOtherPets, setHasOtherPets] = useState<boolean>(false);
  const [otherPetsDetail, setOtherPetsDetail] = useState<string>('');

  const [reason, setReason] = useState<string>('');
  const [dailyCarePlan, setDailyCarePlan] = useState<string>('');

  const draftKey = `adoption_draft_${pet.id}_${user?.uid || 'guest'}`;

  // Restore draft on open or populate from profile
  useEffect(() => {
    if (!isOpen) return;

    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        const d = JSON.parse(saved);
        setName(d.name || profile?.name || profile?.fullName || '');
        setPhone(d.phone || profile?.phone || '');
        setEmail(d.email || user?.email || '');
        setHousingType(d.housingType || 'own_apartment');
        setOwnsHome(d.ownsHome ?? true);
        setLandlordPermission(d.landlordPermission ?? true);
        setHasYard(d.hasYard ?? false);
        setExperience(d.experience || 'intermediate');
        setHasOtherPets(d.hasOtherPets ?? false);
        setOtherPetsDetail(d.otherPetsDetail || '');
        setReason(d.reason || '');
        setDailyCarePlan(d.dailyCarePlan || '');
        if (d.step) setStep(d.step);
        return;
      }
    } catch {
      // ignore
    }

    // Default pre-fill from user context
    setName(profile?.name || profile?.fullName || '');
    setPhone(profile?.phone || '');
    setEmail(user?.email || '');
  }, [isOpen, pet.id, user?.uid, profile, user?.email, draftKey]);

  // Persist draft to sessionStorage on step change or fields change
  useEffect(() => {
    if (!isOpen || isSuccess) return;
    try {
      const draftData = {
        step,
        name,
        phone,
        email,
        housingType,
        ownsHome,
        landlordPermission,
        hasYard,
        experience,
        hasOtherPets,
        otherPetsDetail,
        reason,
        dailyCarePlan,
      };
      sessionStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch {
      // ignore
    }
  }, [
    isOpen,
    isSuccess,
    step,
    name,
    phone,
    email,
    housingType,
    ownsHome,
    landlordPermission,
    hasYard,
    experience,
    hasOtherPets,
    otherPetsDetail,
    reason,
    dailyCarePlan,
    draftKey,
  ]);

  if (!isOpen) return null;

  const validateStep = (currentStep: number): boolean => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMessage('Please provide your full legal name.');
        return false;
      }
      if (!phone.trim() || phone.trim().length < 10) {
        setErrorMessage('Please provide a valid contact phone number.');
        return false;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please provide a valid contact email.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!ownsHome && !landlordPermission) {
        setErrorMessage(
          'Shelters require written landlord permission to house companion animals.'
        );
        return false;
      }
    } else if (currentStep === 3) {
      if (hasOtherPets && !otherPetsDetail.trim()) {
        setErrorMessage(
          'Please describe your other pets (species, age, vaccinated).'
        );
        return false;
      }
    } else if (currentStep === 4) {
      if (!reason.trim() || reason.trim().length < 15) {
        setErrorMessage(
          'Please share why you want to adopt this pet (min 15 characters).'
        );
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    if (!user?.uid) {
      setErrorMessage('You must be signed in to submit an adoption request.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const combinedReason = `${reason.trim()} | Care Plan: ${
        dailyCarePlan.trim() || 'Standard daily exercise and care'
      }`;

      await petAdoptionService.submitAdoptionRequest({
        petId: pet.id,
        petName: pet.name,
        shelterId: pet.shelterId,
        adopterId: user.uid,
        adopterName: name,
        adopterPhone: phone,
        adopterEmail: email,
        reason: combinedReason,
        housingType,
        ownsHome,
        landlordPermission,
        hasYard,
        hasOtherPets,
        otherPetsDetail,
        experience,
      });

      // Clear draft on success
      sessionStorage.removeItem(draftKey);
      setIsSuccess(true);
      onSuccess();
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(
        err?.message ||
          'Failed to submit adoption application. Please try again or check pet availability.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-[#E7DEDF] bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E7DEDF] bg-[#FAF7F2] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E3E8] text-[#7B1E3A]">
              <Heart className="h-5 w-5 fill-[#7B1E3A]" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#231A1D]">
                Adopt {pet.name}
              </h2>
              <p className="text-xs text-[#6B5B61]">
                {pet.breed} • {pet.shelterName}
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#6B5B61] hover:bg-white hover:text-[#231A1D]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        {!isSuccess && (
          <div className="flex border-b border-[#E7DEDF] bg-white px-6 py-3">
            {[
              { num: 1, label: 'About You' },
              { num: 2, label: 'Living' },
              { num: 3, label: 'Experience' },
              { num: 4, label: 'Commitment' },
            ].map((s) => (
              <div key={s.num} className="flex-1 flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    step === s.num
                      ? 'bg-[#7B1E3A] text-white'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#FAF7F2] text-[#6B5B61]'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span
                  className={`hidden sm:inline text-xs font-medium ${
                    step === s.num ? 'text-[#7B1E3A] font-semibold' : 'text-[#6B5B61]'
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 4 && (
                  <div className="mx-2 h-0.5 flex-1 bg-[#E7DEDF]" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess ? (
            /* Success View */
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-bold text-[#231A1D]">
                Application Submitted!
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#6B5B61] leading-relaxed">
                Your adoption request for <strong className="text-[#231A1D]">{pet.name}</strong> has
                been sent to <strong>{pet.shelterName}</strong>. The shelter team will review your
                application and reach out to schedule a home check or video call.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(ROUTES.MY_ADOPTIONS);
                  }}
                  className="rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#63182E]"
                >
                  View My Applications
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#E7DEDF] px-6 py-2.5 text-sm font-medium text-[#6B5B61] hover:bg-[#FAF7F2]"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: About You */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="rounded-xl bg-[#FAF7F2] p-3 text-xs text-[#6B5B61]">
                    These contact details will be shared exclusively with {pet.shelterName} to coordinate your adoption.
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#231A1D]">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      required
                      className="mt-1 w-full rounded-xl border border-[#E7DEDF] p-3 text-sm focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-[#231A1D]">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        required
                        className="mt-1 w-full rounded-xl border border-[#E7DEDF] p-3 text-sm focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#231A1D]">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="priya@example.com"
                        required
                        className="mt-1 w-full rounded-xl border border-[#E7DEDF] p-3 text-sm focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Living Situation */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="text-xs font-semibold text-[#231A1D]">
                      Housing Type
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        { id: 'own_apartment', label: 'Own Apartment' },
                        { id: 'rent_apartment', label: 'Rented Apartment' },
                        { id: 'own_house', label: 'Independent House' },
                        { id: 'rent_house', label: 'Rented House' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setHousingType(item.id as HousingType);
                            setOwnsHome(item.id.startsWith('own'));
                          }}
                          className={`rounded-xl border p-3 text-left text-xs font-medium transition-colors ${
                            housingType === item.id
                              ? 'border-[#7B1E3A] bg-[#F3E3E8]/50 text-[#7B1E3A] font-semibold'
                              : 'border-[#E7DEDF] text-[#231A1D] hover:border-[#7B1E3A]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!ownsHome && (
                    <div className="rounded-xl border border-[#E7DEDF] p-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={landlordPermission}
                          onChange={(e) => setLandlordPermission(e.target.checked)}
                          className="h-4 w-4 rounded-sm border-[#E7DEDF] text-[#7B1E3A] focus:ring-[#7B1E3A]"
                        />
                        <span className="text-xs text-[#231A1D]">
                          I have explicit written permission from my landlord / society to keep pets.
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="rounded-xl border border-[#E7DEDF] p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasYard}
                        onChange={(e) => setHasYard(e.target.checked)}
                        className="h-4 w-4 rounded-sm border-[#E7DEDF] text-[#7B1E3A] focus:ring-[#7B1E3A]"
                      />
                      <span className="text-xs text-[#231A1D]">
                        Home has a private fenced yard or terrace suitable for play.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 3: Experience & Other Pets */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="text-xs font-semibold text-[#231A1D]">
                      Pet Parenting Experience
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[
                        { id: 'first_time', label: 'First-time Parent' },
                        { id: 'intermediate', label: 'Had Pets Before' },
                        { id: 'experienced', label: 'Very Experienced' },
                      ].map((exp) => (
                        <button
                          key={exp.id}
                          type="button"
                          onClick={() => setExperience(exp.id)}
                          className={`rounded-xl border p-2.5 text-center text-xs font-medium transition-colors ${
                            experience === exp.id
                              ? 'border-[#7B1E3A] bg-[#F3E3E8]/50 text-[#7B1E3A] font-semibold'
                              : 'border-[#E7DEDF] text-[#231A1D] hover:border-[#7B1E3A]'
                          }`}
                        >
                          {exp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasOtherPets}
                        onChange={(e) => setHasOtherPets(e.target.checked)}
                        className="h-4 w-4 rounded-sm border-[#E7DEDF] text-[#7B1E3A] focus:ring-[#7B1E3A]"
                      />
                      <span className="text-xs font-semibold text-[#231A1D]">
                        Are there other pets currently living with you?
                      </span>
                    </label>
                  </div>

                  {hasOtherPets && (
                    <div>
                      <label className="text-xs font-medium text-[#6B5B61]">
                        Please describe other pets (species, age, vaccinated, temperament):
                      </label>
                      <textarea
                        rows={2}
                        value={otherPetsDetail}
                        onChange={(e) => setOtherPetsDetail(e.target.value)}
                        placeholder="e.g. 1 vaccinated 3-year-old Indie cat, very friendly with dogs"
                        className="mt-1 w-full rounded-xl border border-[#E7DEDF] p-3 text-xs focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Reason & Commitment */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="text-xs font-semibold text-[#231A1D]">
                      Why do you want to adopt {pet.name}? *
                    </label>
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Share what drew you to this pet and why you feel you are a great match..."
                      required
                      className="mt-1 w-full rounded-xl border border-[#E7DEDF] p-3 text-xs focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#231A1D]">
                      Daily Care & Exercise Plan
                    </label>
                    <textarea
                      rows={2}
                      value={dailyCarePlan}
                      onChange={(e) => setDailyCarePlan(e.target.value)}
                      placeholder="e.g. Morning and evening walks for 45 mins, indoor playtime, vet care routine..."
                      className="mt-1 w-full rounded-xl border border-[#E7DEDF] p-3 text-xs focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                    />
                  </div>

                  <div className="rounded-xl bg-[#FAF7F2] p-3 text-xs text-[#6B5B61]">
                    <ShieldCheck className="inline h-3.5 w-3.5 text-[#7B1E3A] mr-1" />
                    By submitting, you pledge lifelong companionship, routine veterinary checkups,
                    and humane treatment for this rescue pet.
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!isSuccess && (
          <div className="flex items-center justify-between border-t border-[#E7DEDF] bg-white px-6 py-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E7DEDF] px-4 py-2 text-xs font-semibold text-[#6B5B61] hover:bg-[#FAF7F2] disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 rounded-xl bg-[#7B1E3A] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#63182E]"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#63182E] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit Application <Heart className="h-4 w-4 fill-white" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
