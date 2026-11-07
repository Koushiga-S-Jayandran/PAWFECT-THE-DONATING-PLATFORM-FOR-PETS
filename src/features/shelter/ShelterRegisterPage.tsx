import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  shelterRegistrationSchema,
  shelterStep1Schema,
  shelterStep2Schema,
  shelterStep3Schema,
  type ShelterRegistrationFormData,
} from '../../security/shelterValidation.js';
import {
  shelterRegistrationService,
  shelterReader,
  authGateway,
} from '../../app/container.js';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Button } from '../../ui/components/Button.js';
import { Input } from '../../ui/components/Input.js';
import { getEnabledRegions, getRegionByCode } from '../../config/regions.js';
import { ANIMAL_TYPES } from '../../config/animalTypes.js';
import { URGENCY_LEVELS } from '../../config/urgencyLevels.js';
import { SHELTER_ROUTES } from '../../config/shelterRoutes.js';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const ShelterRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isExistingChecking, setIsExistingChecking] = useState(true);

  const currentUser = authGateway.getCurrentUser();

  const enabledRegions = getEnabledRegions();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<ShelterRegistrationFormData>({
    resolver: zodResolver(shelterRegistrationSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      stateCode: 'TN',
      district: 'Chennai',
      area: '',
      animalTypes: ['DOG'],
      contactPerson: '',
      phone: '+91',
      fullAddress: '',
      upiId: '',
      upiHolderName: '',
      registrationNumber: '',
      supportLink: '',
      description: '',
      urgency: 'NORMAL',
      urgencyNote: '',
      consent: false,
    },
  });

  // Check if current user already registered a shelter
  useEffect(() => {
    if (!currentUser) {
      setIsExistingChecking(false);
      return;
    }
    shelterReader
      .getShelterById(currentUser.uid)
      .then((existing) => {
        if (existing) {
          navigate(SHELTER_ROUTES.STATUS, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsExistingChecking(false);
      });
  }, [currentUser, navigate]);

  const watchedStateCode = watch('stateCode');
  const watchedDistricts = getRegionByCode(watchedStateCode)?.districts || [];
  const watchedAnimalTypes = watch('animalTypes') || [];
  const watchedName = watch('name') || '';
  const watchedDesc = watch('description') || '';
  const watchedNote = watch('urgencyNote') || '';

  const handleNextStep1 = async () => {
    const valid = await trigger(['name', 'stateCode', 'district', 'area', 'animalTypes']);
    if (valid) {
      setGeneralError(null);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep2 = async () => {
    const valid = await trigger([
      'contactPerson',
      'phone',
      'fullAddress',
      'upiId',
      'upiHolderName',
    ]);
    if (valid) {
      setGeneralError(null);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAnimalTypeToggle = (typeId: string) => {
    const current = [...watchedAnimalTypes];
    const index = current.indexOf(typeId as any);
    if (index > -1) {
      if (current.length > 1) {
        current.splice(index, 1);
        setValue('animalTypes', current as any, { shouldValidate: true });
      }
    } else {
      if (current.length < 6) {
        current.push(typeId as any);
        setValue('animalTypes', current as any, { shouldValidate: true });
      }
    }
  };

  const onSubmit = async (data: ShelterRegistrationFormData) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    setGeneralError(null);

    try {
      await shelterRegistrationService.registerShelter({
        ownerId: currentUser.uid,
        isEmailVerified: currentUser.emailVerified,
        data,
      });

      navigate(SHELTER_ROUTES.STATUS, { replace: true });
    } catch (err: any) {
      setGeneralError(
        err?.message ||
          'Failed to submit shelter registration. Please review all fields and retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isExistingChecking) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
            <p className="text-xs text-[#6B5B61]">Verifying shelter status...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* Header & Stepper */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E3E8] text-[#7B1E3A]">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="font-heading text-3xl font-medium tracking-tight text-[#231A1D]">
              Register your shelter
            </h1>
            <p className="mt-1.5 text-sm text-[#6B5B61]">
              Available in Tamil Nadu and Kerala. Verified shelters receive 100% direct UPI gifts.
            </p>

            {/* Step Progress Indicator */}
            <div className="mt-6 flex items-center justify-center gap-2 sm:gap-4">
              {[
                { number: 1, label: 'Basics' },
                { number: 2, label: 'Contact & Payment' },
                { number: 3, label: 'Review & Verification' },
              ].map((s) => (
                <div key={s.number} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                      step === s.number
                        ? 'bg-[#7B1E3A] text-white'
                        : step > s.number
                        ? 'bg-[#2E7D5B] text-white'
                        : 'border border-[#E7DEDF] bg-white text-[#6B5B61]'
                    }`}
                  >
                    {step > s.number ? '✓' : s.number}
                  </div>
                  <span
                    className={`hidden text-xs font-medium sm:inline ${
                      step === s.number ? 'text-[#231A1D]' : 'text-[#6B5B61]'
                    }`}
                  >
                    {s.label}
                  </span>
                  {s.number < 3 && (
                    <div className="h-0.5 w-6 bg-[#E7DEDF] sm:w-10" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Card padding="lg" className="shadow-xs text-left">
            {generalError && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-[#B4423A]/20 bg-[#B4423A]/10 p-4 text-xs text-[#B4423A] flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{generalError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* STEP 1: BASICS */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <h2 className="text-base font-semibold text-[#231A1D]">
                    Step 1: Shelter Location & Focus
                  </h2>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-[#231A1D]">
                        Shelter or Foundation Name
                      </label>
                      <span className="text-xs text-[#6B5B61]">
                        {watchedName.length}/80
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Hope For Strays Rescue Sanctuary"
                      maxLength={80}
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-[#E7DEDF] bg-white px-3.5 py-2.5 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-[#B4423A]" role="alert">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[#231A1D]">
                        State
                      </label>
                      <select
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-[#E7DEDF] bg-white px-3.5 py-2.5 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                        {...register('stateCode')}
                      >
                        {enabledRegions.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name} ({r.code})
                          </option>
                        ))}
                      </select>
                      {errors.stateCode && (
                        <p className="mt-1 text-xs text-[#B4423A]">
                          {errors.stateCode.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#231A1D]">
                        District
                      </label>
                      <select
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-[#E7DEDF] bg-white px-3.5 py-2.5 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                        {...register('district')}
                      >
                        {watchedDistricts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {errors.district && (
                        <p className="mt-1 text-xs text-[#B4423A]">
                          {errors.district.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Area / Locality"
                    placeholder="e.g. Velachery Main Road or Aluva East"
                    maxLength={80}
                    error={errors.area?.message}
                    {...register('area')}
                  />

                  <div>
                    <label className="block text-sm font-medium text-[#231A1D] mb-1.5">
                      Animal Types Cared For (Select at least one)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ANIMAL_TYPES.map((type) => {
                        const isSelected = watchedAnimalTypes.includes(type.id);
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => handleAnimalTypeToggle(type.id)}
                            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                              isSelected
                                ? 'bg-[#7B1E3A] text-white shadow-xs'
                                : 'border border-[#E7DEDF] bg-[#FAF7F2] text-[#6B5B61] hover:border-[#7B1E3A]/40'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                    {errors.animalTypes && (
                      <p className="mt-1 text-xs text-[#B4423A]" role="alert">
                        {errors.animalTypes.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="button"
                      size="md"
                      onClick={handleNextStep1}
                      className="gap-2"
                    >
                      <span>Continue to Contact</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: CONTACT & PAYMENT */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <h2 className="text-base font-semibold text-[#231A1D]">
                    Step 2: Shelter Representative & Direct UPI
                  </h2>

                  <p className="text-xs text-[#6B5B61]">
                    These details are stored privately in our zero-trust vault. Only verified admins review them. Donors never see private contact or UPI handles during this step.
                  </p>

                  <Input
                    label="Contact Person Name"
                    placeholder="e.g. Dr. K. Meenakshi"
                    maxLength={80}
                    error={errors.contactPerson?.message}
                    {...register('contactPerson')}
                  />

                  <Input
                    label="Mobile Number (+91)"
                    type="tel"
                    placeholder="+919876543210"
                    helperText="10-digit Indian phone number for administrative verification calls"
                    error={errors.phone?.message}
                    {...register('phone')}
                  />

                  <div>
                    <label className="block text-sm font-medium text-[#231A1D]">
                      Full Physical Address
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Door number, street name, landmarks, postal code"
                      maxLength={250}
                      className="mt-1 w-full rounded-xl border border-[#E7DEDF] bg-white p-3 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                      {...register('fullAddress')}
                    />
                    {errors.fullAddress && (
                      <p className="mt-1 text-xs text-[#B4423A]" role="alert">
                        {errors.fullAddress.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Shelter UPI ID"
                      placeholder="e.g. pawfectshelter@sbi"
                      helperText="Official UPI ID of the shelter or trust"
                      error={errors.upiId?.message}
                      {...register('upiId')}
                    />

                    <Input
                      label="UPI Account Holder Name"
                      placeholder="Exact name registered on UPI handle"
                      maxLength={80}
                      error={errors.upiHolderName?.message}
                      {...register('upiHolderName')}
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => setStep(1)}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      <span>Back to Basics</span>
                    </Button>

                    <Button
                      type="button"
                      size="md"
                      onClick={handleNextStep2}
                      className="gap-2"
                    >
                      <span>Review & Submit</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & VERIFICATION */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <h2 className="text-base font-semibold text-[#231A1D]">
                    Step 3: Verification Details & Summary
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Trust / NGO Registration Number (Optional)"
                      placeholder="e.g. TN/TRUST/2019/0491"
                      maxLength={60}
                      error={errors.registrationNumber?.message}
                      {...register('registrationNumber')}
                    />

                    <Input
                      label="Website or Social Link (Optional)"
                      placeholder="https://instagram.com/ourshelter"
                      helperText="Must be a secure https:// link"
                      maxLength={200}
                      error={errors.supportLink?.message}
                      {...register('supportLink')}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-[#231A1D]">
                        Shelter Description (30 - 500 characters)
                      </label>
                      <span className="text-xs text-[#6B5B61]">
                        {watchedDesc.length}/500
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Describe your shelter's mission, rescue work, facility capacity, and how donations will help the animals."
                      maxLength={500}
                      className="mt-1 w-full rounded-xl border border-[#E7DEDF] bg-white p-3 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="mt-1 text-xs text-[#B4423A]" role="alert">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[#231A1D]">
                        Current Shelter Urgency Status
                      </label>
                      <select
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-[#E7DEDF] bg-white px-3.5 py-2.5 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                        {...register('urgency')}
                      >
                        {URGENCY_LEVELS.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label} — {u.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-[#231A1D]">
                          Urgency Note (Optional)
                        </label>
                        <span className="text-xs text-[#6B5B61]">
                          {watchedNote.length}/140
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 15 rescued puppies need parvo serum"
                        maxLength={140}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-[#E7DEDF] bg-white px-3.5 py-2.5 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                        {...register('urgencyNote')}
                      />
                      {errors.urgencyNote && (
                        <p className="mt-1 text-xs text-[#B4423A]">
                          {errors.urgencyNote.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary Review Card */}
                  <div className="rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] p-4 text-xs space-y-2">
                    <p className="font-semibold text-[#231A1D] text-sm">
                      Submission Summary
                    </p>
                    <p className="text-[#6B5B61]">
                      <strong className="text-[#231A1D]">Name:</strong> {watchedName || '—'}
                    </p>
                    <p className="text-[#6B5B61]">
                      <strong className="text-[#231A1D]">Location:</strong>{' '}
                      {watch('area')}, {watch('district')},{' '}
                      {getRegionByCode(watchedStateCode)?.name}
                    </p>
                    <p className="text-[#6B5B61]">
                      <strong className="text-[#231A1D]">Animals:</strong>{' '}
                      {watchedAnimalTypes.join(', ')}
                    </p>
                    <p className="text-[#6B5B61]">
                      <strong className="text-[#231A1D]">UPI:</strong> {watch('upiId')} (
                      {watch('upiHolderName')})
                    </p>
                  </div>

                  {/* Consent Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-[#E7DEDF] text-[#7B1E3A] focus:ring-[#7B1E3A]"
                        {...register('consent')}
                      />
                      <span className="text-xs leading-relaxed text-[#6B5B61]">
                        I confirm that all details provided are accurate. I understand that the shelter is created in <strong>PENDING</strong> status and will remain invisible to donors until an admin completes manual phone and documentation verification.
                      </span>
                    </label>
                    {errors.consent && (
                      <p className="mt-1 text-xs text-[#B4423A]" role="alert">
                        {errors.consent.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => setStep(2)}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      <span>Back to Contact</span>
                    </Button>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                      className="gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      <span>Submit for Verification</span>
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};
