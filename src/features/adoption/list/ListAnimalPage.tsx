import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.js';
import { ROUTES } from '../../../config/constants.js';
import {
  EMPTY_LISTING_DRAFT,
  useListingFormDraft,
} from '../../../hooks/useListingFormDraft.js';
import { adoptionListingService } from '../../../services/AdoptionListingService.js';
import { adoptionListingRepo } from '../../../repositories/FirebaseAdoptionListingRepository.js';
import {
  normalizeIndianMobile,
  stepAnimalSchema,
  stepContactSchema,
  stepHealthNatureSchema,
  stepLocationSchema,
  stepPhotosSchema,
  stepStorySchema,
} from '../../../security/adoptionListingValidation.js';
import { DogCompanion } from './DogCompanion.js';
import { StepAnimalInfo } from './StepAnimalInfo.js';
import { StepHealthNature } from './StepHealthNature.js';
import { StepPhotos } from './StepPhotos.js';
import { StepStory } from './StepStory.js';
import { StepLocation } from './StepLocation.js';
import { StepContactOtp } from './StepContactOtp.js';
import { StepReviewPreview } from './StepReviewPreview.js';

const STEPS = [
  { id: 1, title: 'Animal' },
  { id: 2, title: 'Health & Nature' },
  { id: 3, title: 'Photos' },
  { id: 4, title: 'Story' },
  { id: 5, title: 'Location' },
  { id: 6, title: 'Contact & OTP' },
  { id: 7, title: 'Review' },
] as const;

export const ListAnimalPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editListingId = searchParams.get('edit');
  const isEditMode = Boolean(editListingId);

  const { draft, updateDraft, clearDraft, resetWithInitial } = useListingFormDraft(
    user?.uid,
    isEditMode
  );

  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [wasApprovedBeforeEdit, setWasApprovedBeforeEdit] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    listingId: string;
    resetToPending: boolean;
  } | null>(null);

  const [shelterInfo, setShelterInfo] = useState<{
    verifiedShelter: boolean;
    hasShelterRecord: boolean;
    shelterName?: string;
    shelterStatus?: string;
  }>({ verifiedShelter: false, hasShelterRecord: false });

  // Pre-fill contact name from profile if blank
  useEffect(() => {
    if (!isEditMode && !draft.contactName && (profile?.fullName || profile?.name)) {
      updateDraft({ contactName: (profile.fullName || profile.name || '').trim() });
    }
  }, [isEditMode, draft.contactName, profile, updateDraft]);

  // Load shelter verification status
  useEffect(() => {
    if (!user?.uid) return;
    adoptionListingService
      .resolveShelterVerification(user.uid, 'shelter')
      .then(setShelterInfo)
      .catch(() => {});
  }, [user?.uid]);

  // Load existing listing if editing
  useEffect(() => {
    if (!editListingId || !user?.uid) return;
    setLoadingEdit(true);
    Promise.all([
      adoptionListingRepo.getListingById(editListingId),
      adoptionListingRepo.getPrivateContact(editListingId),
    ])
      .then(([listing, contact]) => {
        if (!listing) {
          setStepError('Listing not found.');
          return;
        }
        if (listing.listerUid !== user.uid) {
          setStepError('You do not have permission to edit this listing.');
          return;
        }
        setWasApprovedBeforeEdit(listing.status === 'approved');
        const years = listing.ageMonths >= 12 && listing.ageMonths % 12 === 0;
        const verifiedPhone = contact?.phone || '';
        resetWithInitial({
          ...EMPTY_LISTING_DRAFT,
          step: 1,
          listerType: listing.listerType,
          name: listing.name,
          isUnnamed: listing.isUnnamed,
          species: listing.species,
          breed: listing.breed,
          ageValue: years ? Math.floor(listing.ageMonths / 12) : listing.ageMonths,
          ageUnit: years ? 'years' : 'months',
          gender: listing.gender,
          size: listing.size,
          color: listing.color,
          vaccinated: listing.vaccinated,
          sterilised: listing.sterilised,
          injuriesOrConditions:
            listing.injuriesOrConditions === 'None reported' ? '' : listing.injuriesOrConditions,
          temperament: listing.temperament,
          goodWithKids: listing.goodWithKids,
          goodWithOtherPets: listing.goodWithOtherPets,
          photos: listing.photos,
          story: listing.story,
          stateCode: listing.stateCode,
          district: listing.district,
          city: listing.city,
          contactName: contact?.contactName || listing.contactName,
          phone: verifiedPhone,
          revealOnlyToApproved: contact?.revealOnlyToApproved ?? true,
          phoneVerifiedForNumber: verifiedPhone ? normalizeIndianMobile(verifiedPhone) : '',
        });
      })
      .catch((err) => {
        setStepError(err?.message || 'Failed to load listing for editing.');
      })
      .finally(() => setLoadingEdit(false));
  }, [editListingId, user?.uid, resetWithInitial]);

  const computedAgeMonths =
    draft.ageUnit === 'years' ? draft.ageValue * 12 : draft.ageValue;

  const isPhoneVerified =
    Boolean(draft.phoneVerifiedForNumber) &&
    draft.phoneVerifiedForNumber === normalizeIndianMobile(draft.phone || '');

  const validateCurrentStep = (stepNumber: number): boolean => {
    setStepError(null);
    try {
      if (stepNumber === 1) {
        stepAnimalSchema.parse({
          listerType: draft.listerType,
          isUnnamed: draft.isUnnamed,
          name: draft.isUnnamed ? 'Unnamed' : draft.name,
          species: draft.species,
          breed: draft.breed,
          ageMonths: computedAgeMonths,
          gender: draft.gender,
          size: draft.size,
          color: draft.color,
        });
        if (draft.listerType === 'shelter' && !shelterInfo.hasShelterRecord) {
          setStepError(
            'No shelter registration exists for your account. Choose Individual or register a shelter first.'
          );
          return false;
        }
      } else if (stepNumber === 2) {
        stepHealthNatureSchema.parse({
          vaccinated: draft.vaccinated,
          sterilised: draft.sterilised,
          injuriesOrConditions: draft.injuriesOrConditions,
          temperament: draft.temperament,
          goodWithKids: draft.goodWithKids,
          goodWithOtherPets: draft.goodWithOtherPets,
        });
      } else if (stepNumber === 3) {
        stepPhotosSchema.parse({ photos: draft.photos });
      } else if (stepNumber === 4) {
        stepStorySchema.parse({ story: draft.story });
      } else if (stepNumber === 5) {
        stepLocationSchema.parse({
          stateCode: draft.stateCode,
          district: draft.district,
          city: draft.city,
        });
      } else if (stepNumber === 6) {
        stepContactSchema.parse({
          contactName: draft.contactName,
          phone: draft.phone,
          revealOnlyToApproved: draft.revealOnlyToApproved,
          phoneVerified: isPhoneVerified,
        });
      }
      return true;
    } catch (err: any) {
      const firstIssue = err?.issues?.[0]?.message || err?.message || 'Please check the highlighted fields.';
      setStepError(firstIssue);
      return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep(draft.step)) {
      updateDraft({ step: Math.min(7, draft.step + 1) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setStepError(null);
    updateDraft({ step: Math.max(1, draft.step - 1) });
  };

  const handleSubmit = async () => {
    if (!user?.uid) return;
    setStepError(null);
    setSubmitting(true);

    const payload = {
      listerUid: user.uid,
      listerType: draft.listerType,
      name: draft.isUnnamed ? 'Unnamed' : draft.name,
      isUnnamed: draft.isUnnamed,
      species: draft.species,
      breed: draft.breed,
      ageMonths: computedAgeMonths,
      gender: draft.gender,
      size: draft.size,
      color: draft.color,
      vaccinated: draft.vaccinated,
      sterilised: draft.sterilised,
      injuriesOrConditions: draft.injuriesOrConditions,
      temperament: draft.temperament,
      goodWithKids: draft.goodWithKids,
      goodWithOtherPets: draft.goodWithOtherPets,
      photos: draft.photos,
      story: draft.story,
      stateCode: draft.stateCode,
      district: draft.district,
      city: draft.city,
      contactName: draft.contactName,
      phone: draft.phone,
      revealOnlyToApproved: draft.revealOnlyToApproved,
      phoneVerified: isPhoneVerified,
    };

    try {
      if (editListingId) {
        const res = await adoptionListingService.editListing(editListingId, payload);
        setSubmittedResult({
          listingId: editListingId,
          resetToPending: res.resetToPending,
        });
      } else {
        const res = await adoptionListingService.createListing(payload);
        clearDraft();
        setSubmittedResult({ listingId: res.listingId, resetToPending: false });
      }
    } catch (err: any) {
      const msg = err?.issues?.[0]?.message || err?.message || 'Submission failed. Please retry.';
      setStepError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#110E10] text-[#F6F0EC] flex flex-col">
      {/* Dark-themed minimal header */}
      <header className="border-b border-[#2D2328] bg-[#161114]/95 sticky top-0 z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            to={ROUTES.PETS}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#CBBBC2] hover:text-[#F6F0EC]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Adopt
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to={ROUTES.MY_LISTINGS}
              className="text-xs font-semibold text-[#E2B75B] hover:underline"
            >
              My Listings
            </Link>
            {!isEditMode && !submittedResult && (
              <button
                type="button"
                onClick={() => {
                  clearDraft();
                  setStepError(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-[#8D7D83] hover:text-[#F6F0EC]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset draft
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {loadingEdit ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#D94F73]" />
            <p className="mt-3 text-sm text-[#B8A8AE]">Loading listing details...</p>
          </div>
        ) : submittedResult ? (
          /* Confirmation Screen with Wagging DogCompanion */
          <section className="rounded-3xl border border-[#382D32] bg-[#1B1618] p-8 sm:p-12 text-center shadow-2xl">
            <DogCompanion
              celebrating={true}
              caption="Submitted for safety & admin review"
            />

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-4 py-1.5 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Status: Pending Admin Approval
            </div>

            <h1 className="mt-4 font-serif text-3xl sm:text-4xl font-bold text-[#F6F0EC]">
              {isEditMode ? 'Listing Updated!' : 'Thank You for Giving Them a Chance!'}
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#B8A8AE]">
              {submittedResult.resetToPending
                ? 'Because this listing was already live, your edits placed it back into the admin moderation queue to keep adopter trust strong.'
                : 'Our moderation team reviews every listing before it goes public. You will receive a notification as soon as it is approved.'}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(ROUTES.MY_LISTINGS)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#7B1E3A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#932547]"
              >
                Manage My Listings
              </button>
              <button
                type="button"
                onClick={() => navigate(ROUTES.PETS)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#382D32] bg-[#161114] px-6 py-3 text-sm font-semibold text-[#CBBBC2] hover:border-[#6A4A57]"
              >
                Browse Public Portal
              </button>
            </div>
          </section>
        ) : (
          /* Multi-Step Form Shell */
          <div className="space-y-6">
            {/* Hero Title + Single Dog Companion */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-[#382D32] bg-[#1B1618] p-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#E2B75B]">
                  {isEditMode ? 'Edit Adoption Listing' : 'List an Animal for Adoption'}
                </span>
                <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-[#F6F0EC]">
                  {isEditMode ? 'Update Companion Profile' : 'Help a Companion Find Home'}
                </h1>
                <p className="mt-1 text-xs text-[#B8A8AE]">
                  Tamil Nadu &amp; Kerala · Zero-fee adoption policy · Progress auto-saved
                </p>
              </div>
              <div className="self-center sm:self-auto shrink-0">
                <DogCompanion celebrating={false} />
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="rounded-2xl border border-[#382D32] bg-[#1B1618] p-4">
              <div className="flex items-center justify-between text-xs font-medium text-[#B8A8AE] mb-2.5">
                <span>
                  Step {draft.step} of {STEPS.length}:{' '}
                  <strong className="text-[#F6F0EC]">{STEPS[draft.step - 1]?.title}</strong>
                </span>
                <span>{Math.round((draft.step / STEPS.length) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#2D2328]">
                <div
                  className="h-full bg-[#D94F73] transition-all duration-200 ease-out"
                  style={{ width: `${(draft.step / STEPS.length) * 100}%` }}
                />
              </div>
              <div className="mt-3 hidden sm:flex justify-between gap-1 text-[11px]">
                {STEPS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={s.id > draft.step}
                    onClick={() => s.id < draft.step && updateDraft({ step: s.id })}
                    className={`truncate px-1.5 py-0.5 rounded transition-colors ${
                      s.id === draft.step
                        ? 'text-[#F6F0EC] font-semibold'
                        : s.id < draft.step
                        ? 'text-emerald-300 hover:underline cursor-pointer'
                        : 'text-[#6B5B61] cursor-not-allowed'
                    }`}
                  >
                    {s.id}. {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Step Content Card */}
            <div className="rounded-3xl border border-[#382D32] bg-[#1B1618] p-6 sm:p-8 shadow-xl">
              {draft.step === 1 && (
                <StepAnimalInfo
                  draft={draft}
                  onChange={updateDraft}
                  shelterInfo={shelterInfo}
                  error={stepError}
                />
              )}
              {draft.step === 2 && (
                <StepHealthNature
                  draft={draft}
                  onChange={updateDraft}
                  error={stepError}
                />
              )}
              {draft.step === 3 && (
                <StepPhotos
                  draft={draft}
                  onChange={updateDraft}
                  error={stepError}
                />
              )}
              {draft.step === 4 && (
                <StepStory
                  draft={draft}
                  onChange={updateDraft}
                  error={stepError}
                />
              )}
              {draft.step === 5 && (
                <StepLocation
                  draft={draft}
                  onChange={updateDraft}
                  error={stepError}
                />
              )}
              {draft.step === 6 && (
                <StepContactOtp
                  draft={draft}
                  onChange={updateDraft}
                  error={stepError}
                />
              )}
              {draft.step === 7 && (
                <StepReviewPreview
                  draft={draft}
                  shelterInfo={shelterInfo}
                  isEditMode={isEditMode}
                  wasApprovedBeforeEdit={wasApprovedBeforeEdit}
                  error={stepError}
                />
              )}

              {/* Navigation Footer */}
              <div className="mt-8 flex items-center justify-between border-t border-[#382D32] pt-6">
                {draft.step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={submitting}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#382D32] bg-[#161114] px-5 py-2.5 text-sm font-semibold text-[#CBBBC2] hover:border-[#6A4A57] disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {draft.step < 7 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#932547]"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />{' '}
                        {isEditMode ? 'Save & Re-submit' : 'Submit Listing'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
