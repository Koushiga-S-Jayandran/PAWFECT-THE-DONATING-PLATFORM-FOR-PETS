/**
 * Adoption Listing Service (SRP + Dependency Inversion)
 * Orchestrates creation, editing (forces re-approval when approved), lifecycle transitions,
 * rate limit & duplicate blocking, shelter verification lookup, and 60-day inactivity checks.
 */

import { doc, collection, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import {
  LISTING_STATUS,
  LISTING_LIMITS,
  type ListingStatus,
  type ListerType,
} from '../config/adoptionListingConfig.js';
import { getRegionByCode } from '../config/regions.js';
import type {
  AdoptionListing,
  ListingPrivateContact,
  ListingFilterCriteria,
} from '../domain/adoptionListingEntities.js';
import {
  stepAnimalSchema,
  stepHealthNatureSchema,
  stepPhotosSchema,
  stepStorySchema,
  stepLocationSchema,
  stepContactSchema,
  computeListingFingerprint,
  normalizeIndianMobile,
} from '../security/adoptionListingValidation.js';
import {
  canListerChangeStatus,
  checkDailyRateLimit,
  computeExpiryIso,
  evaluateListingInactivity,
  getTodayUtcDateKey,
  resolveStatusAfterListerEdit,
} from '../domain/listingLifecycle.js';
import { adoptionListingRepo, type FetchListingsResult } from '../repositories/FirebaseAdoptionListingRepository.js';
import { shelterReader } from '../app/container.js';
import type { DocumentSnapshot } from 'firebase/firestore';

export interface SubmitListingInput {
  listerUid: string;
  listerType: ListerType;
  name: string;
  isUnnamed: boolean;
  species: 'dog' | 'cat' | 'other';
  breed: string;
  ageMonths: number;
  gender: 'male' | 'female' | 'unknown';
  size: 'small' | 'medium' | 'large';
  color: string;
  vaccinated: boolean;
  sterilised: boolean;
  injuriesOrConditions: string;
  temperament: string[];
  goodWithKids: 'yes' | 'no' | 'unknown';
  goodWithOtherPets: 'yes' | 'no' | 'unknown';
  photos: string[];
  story: string;
  stateCode: string;
  district: string;
  city: string;
  contactName: string;
  phone: string;
  revealOnlyToApproved: boolean;
  phoneVerified: boolean;
}

export class AdoptionListingService {
  async resolveShelterVerification(
    uid: string,
    listerType: ListerType
  ): Promise<{ verifiedShelter: boolean; shelterId?: string; shelterName?: string; hasShelterRecord: boolean; shelterStatus?: string }> {
    if (listerType !== 'shelter') {
      return { verifiedShelter: false, hasShelterRecord: false };
    }
    const shelter = await shelterReader.getShelterById(uid);
    if (!shelter) {
      return { verifiedShelter: false, hasShelterRecord: false };
    }
    const isApproved = shelter.status === 'APPROVED' && shelter.verified === true;
    return {
      verifiedShelter: isApproved,
      shelterId: shelter.ownerId,
      shelterName: shelter.name,
      hasShelterRecord: true,
      shelterStatus: shelter.status,
    };
  }

  validateFullSubmission(input: SubmitListingInput) {
    const a = stepAnimalSchema.parse({
      listerType: input.listerType,
      isUnnamed: input.isUnnamed,
      name: input.isUnnamed ? 'Unnamed' : input.name,
      species: input.species,
      breed: input.breed,
      ageMonths: input.ageMonths,
      gender: input.gender,
      size: input.size,
      color: input.color,
    });

    const b = stepHealthNatureSchema.parse({
      vaccinated: input.vaccinated,
      sterilised: input.sterilised,
      injuriesOrConditions: input.injuriesOrConditions,
      temperament: input.temperament,
      goodWithKids: input.goodWithKids,
      goodWithOtherPets: input.goodWithOtherPets,
    });

    const c = stepPhotosSchema.parse({ photos: input.photos });
    const d = stepStorySchema.parse({ story: input.story });
    const e = stepLocationSchema.parse({
      stateCode: input.stateCode,
      district: input.district,
      city: input.city,
    });
    const f = stepContactSchema.parse({
      contactName: input.contactName,
      phone: input.phone,
      revealOnlyToApproved: input.revealOnlyToApproved,
      phoneVerified: input.phoneVerified,
    });

    return { a, b, c, d, e, f };
  }

  async createListing(input: SubmitListingInput): Promise<{ listingId: string }> {
    const validated = this.validateFullSubmission(input);
    const todayKey = getTodayUtcDateKey();

    // 1. Daily Rate Limit Check
    const rateDoc = await adoptionListingRepo.getDailyRateLimitDoc(input.listerUid);
    const rateDecision = checkDailyRateLimit({
      storedDateKey: rateDoc?.dateKey,
      storedCount: rateDoc?.count,
      todayDateKey: todayKey,
      maxPerDay: LISTING_LIMITS.MAX_LISTINGS_PER_DAY,
    });
    if (!rateDecision.allowed) {
      throw new Error(
        `Daily limit reached: you can create up to ${LISTING_LIMITS.MAX_LISTINGS_PER_DAY} adoption listings per day.`
      );
    }

    // 2. Duplicate Submission Block
    const displayName = validated.a.isUnnamed ? 'Unnamed' : validated.a.name;
    const fingerprint = await computeListingFingerprint({
      listerUid: input.listerUid,
      species: validated.a.species,
      name: displayName,
      breed: validated.a.breed,
      gender: validated.a.gender,
      ageMonths: validated.a.ageMonths,
      stateCode: validated.e.stateCode,
      district: validated.e.district,
    });

    const isDup = await adoptionListingRepo.hasDuplicateFingerprint(fingerprint);
    if (isDup) {
      throw new Error(
        'A very similar active listing from your account already exists. Please edit your existing listing instead.'
      );
    }

    // 3. Shelter Verification (verified ONLY if admin-approved)
    const shelterInfo = await this.resolveShelterVerification(input.listerUid, validated.a.listerType);
    if (validated.a.listerType === 'shelter' && !shelterInfo.hasShelterRecord) {
      throw new Error(
        'You selected Registered Shelter, but no shelter registration was found for your account. Switch to Individual or register your shelter first.'
      );
    }

    const region = getRegionByCode(validated.e.stateCode);
    const nowIso = new Date().toISOString();
    const expiresIso = computeExpiryIso();
    const listingRef = doc(collection(db, 'adoptionListings'));

    const listing: AdoptionListing = {
      id: listingRef.id,
      listerUid: input.listerUid,
      listerType: validated.a.listerType,
      ...(shelterInfo.shelterId ? { shelterId: shelterInfo.shelterId } : {}),
      ...(shelterInfo.shelterName ? { shelterName: shelterInfo.shelterName } : {}),
      verifiedShelter: shelterInfo.verifiedShelter,
      name: displayName,
      isUnnamed: validated.a.isUnnamed,
      species: validated.a.species,
      breed: validated.a.breed,
      ageMonths: validated.a.ageMonths,
      gender: validated.a.gender,
      size: validated.a.size,
      color: validated.a.color,
      vaccinated: validated.b.vaccinated,
      sterilised: validated.b.sterilised,
      injuriesOrConditions: validated.b.injuriesOrConditions || 'None reported',
      temperament: validated.b.temperament,
      goodWithKids: validated.b.goodWithKids,
      goodWithOtherPets: validated.b.goodWithOtherPets,
      photos: validated.c.photos,
      story: validated.d.story,
      stateCode: validated.e.stateCode,
      stateName: region?.name || validated.e.stateCode,
      district: validated.e.district,
      city: validated.e.city,
      contactName: validated.f.contactName,
      revealOnlyToApproved: true,
      phoneVerified: true,
      status: LISTING_STATUS.PENDING,
      wasPreviouslyApproved: false,
      duplicateFingerprint: fingerprint,
      lastActivityAt: nowIso,
      expiresAt: expiresIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const privateContact: ListingPrivateContact = {
      listingId: listing.id,
      listerUid: input.listerUid,
      contactName: validated.f.contactName,
      phone: normalizeIndianMobile(validated.f.phone),
      revealOnlyToApproved: validated.f.revealOnlyToApproved,
      otpVerifiedAt: nowIso,
      updatedAt: nowIso,
    };

    await adoptionListingRepo.createListingAtomic({
      listing,
      privateContact,
      rateLimit: {
        uid: input.listerUid,
        dateKey: todayKey,
        nextCount: rateDecision.nextCount,
      },
      auditLog: {
        id: `listing_${listing.id}_created_${Date.now()}`,
        listingId: listing.id,
        actorUid: input.listerUid,
        actorRole: 'lister',
        action: 'LISTING_CREATED',
        toStatus: LISTING_STATUS.PENDING,
        createdAt: nowIso,
      },
    });

    return { listingId: listing.id };
  }

  async editListing(listingId: string, input: SubmitListingInput): Promise<{ resetToPending: boolean }> {
    const existing = await adoptionListingRepo.getListingById(listingId);
    if (!existing) throw new Error('Listing not found.');
    if (existing.listerUid !== input.listerUid) {
      throw new Error('You do not have permission to edit this listing.');
    }

    const validated = this.validateFullSubmission(input);
    const displayName = validated.a.isUnnamed ? 'Unnamed' : validated.a.name;
    const newFingerprint = await computeListingFingerprint({
      listerUid: input.listerUid,
      species: validated.a.species,
      name: displayName,
      breed: validated.a.breed,
      gender: validated.a.gender,
      ageMonths: validated.a.ageMonths,
      stateCode: validated.e.stateCode,
      district: validated.e.district,
    });

    if (newFingerprint !== existing.duplicateFingerprint) {
      const dup = await adoptionListingRepo.hasDuplicateFingerprint(newFingerprint);
      if (dup) {
        throw new Error('Another active listing with identical details already exists.');
      }
    }

    const shelterInfo = await this.resolveShelterVerification(input.listerUid, validated.a.listerType);
    const region = getRegionByCode(validated.e.stateCode);
    const nowIso = new Date().toISOString();
    const nextStatus = resolveStatusAfterListerEdit(existing.status);
    const resetToPending = existing.status === LISTING_STATUS.APPROVED && nextStatus === LISTING_STATUS.PENDING;

    await adoptionListingRepo.updateListingAtomic({
      listingId,
      oldFingerprint: existing.duplicateFingerprint,
      newFingerprint,
      listingUpdates: {
        listerType: validated.a.listerType,
        shelterId: shelterInfo.shelterId ?? (deleteField() as any),
        shelterName: shelterInfo.shelterName ?? (deleteField() as any),
        verifiedShelter: shelterInfo.verifiedShelter,
        name: displayName,
        isUnnamed: validated.a.isUnnamed,
        species: validated.a.species,
        breed: validated.a.breed,
        ageMonths: validated.a.ageMonths,
        gender: validated.a.gender,
        size: validated.a.size,
        color: validated.a.color,
        vaccinated: validated.b.vaccinated,
        sterilised: validated.b.sterilised,
        injuriesOrConditions: validated.b.injuriesOrConditions || 'None reported',
        temperament: validated.b.temperament,
        goodWithKids: validated.b.goodWithKids,
        goodWithOtherPets: validated.b.goodWithOtherPets,
        photos: validated.c.photos,
        story: validated.d.story,
        stateCode: validated.e.stateCode,
        stateName: region?.name || validated.e.stateCode,
        district: validated.e.district,
        city: validated.e.city,
        contactName: validated.f.contactName,
        revealOnlyToApproved: true,
        phoneVerified: true,
        status: nextStatus,
        wasPreviouslyApproved: existing.status === LISTING_STATUS.APPROVED || Boolean(existing.wasPreviouslyApproved),
        moderationReason: nextStatus === LISTING_STATUS.PENDING ? '' : existing.moderationReason || '',
        duplicateFingerprint: newFingerprint,
        lastActivityAt: nowIso,
        expiresAt: computeExpiryIso(),
        inactivityReminderSentAt: '',
        updatedAt: nowIso,
      },
      privateContactUpdates: {
        listerUid: input.listerUid,
        contactName: validated.f.contactName,
        phone: normalizeIndianMobile(validated.f.phone),
        revealOnlyToApproved: validated.f.revealOnlyToApproved,
        otpVerifiedAt: nowIso,
        updatedAt: nowIso,
      },
      auditLog: {
        id: `listing_${listingId}_edit_${Date.now()}`,
        listingId,
        actorUid: input.listerUid,
        actorRole: 'lister',
        action: resetToPending ? 'LISTING_EDITED_REAPPROVAL_REQUIRED' : 'LISTING_EDITED',
        fromStatus: existing.status,
        toStatus: nextStatus,
        createdAt: nowIso,
      },
    });

    return { resetToPending };
  }

  async changeListerStatus(params: {
    listingId: string;
    actorUid: string;
    toStatus: Extract<ListingStatus, 'adopted' | 'on_hold' | 'approved'>;
  }): Promise<void> {
    const listing = await adoptionListingRepo.getListingById(params.listingId);
    if (!listing) throw new Error('Listing not found.');
    if (listing.listerUid !== params.actorUid) {
      throw new Error('Unauthorized: Only the listing creator can update its status.');
    }

    const check = canListerChangeStatus({
      fromStatus: listing.status,
      toStatus: params.toStatus,
    });
    if (!check.allowed) {
      throw new Error(check.error || 'Status transition not allowed.');
    }

    const nowIso = new Date().toISOString();
    const updates: Partial<AdoptionListing> = {
      status: params.toStatus,
      lastActivityAt: nowIso,
      expiresAt: computeExpiryIso(),
      inactivityReminderSentAt: '',
      updatedAt: nowIso,
    };
    if (params.toStatus === LISTING_STATUS.ADOPTED) {
      updates.adoptedAt = nowIso;
    }

    await adoptionListingRepo.updateListingFieldsWithAudit({
      listingId: params.listingId,
      updates,
      auditLog: {
        id: `listing_${params.listingId}_status_${Date.now()}`,
        listingId: params.listingId,
        actorUid: params.actorUid,
        actorRole: 'lister',
        action: `LISTER_MARKED_${params.toStatus.toUpperCase()}`,
        fromStatus: listing.status,
        toStatus: params.toStatus,
        createdAt: nowIso,
      },
    });
  }

  async renewListingActivity(listingId: string, actorUid: string): Promise<void> {
    const listing = await adoptionListingRepo.getListingById(listingId);
    if (!listing) throw new Error('Listing not found.');
    if (listing.listerUid !== actorUid) throw new Error('Unauthorized.');

    const nowIso = new Date().toISOString();
    const nextStatus =
      listing.status === LISTING_STATUS.EXPIRED_HIDDEN
        ? LISTING_STATUS.PENDING
        : listing.status;

    await adoptionListingRepo.updateListingFieldsWithAudit({
      listingId,
      updates: {
        status: nextStatus,
        lastActivityAt: nowIso,
        expiresAt: computeExpiryIso(),
        inactivityReminderSentAt: '',
        updatedAt: nowIso,
      },
      auditLog: {
        id: `listing_${listingId}_renew_${Date.now()}`,
        listingId,
        actorUid,
        actorRole: 'lister',
        action: 'LISTING_ACTIVITY_RENEWED',
        fromStatus: listing.status,
        toStatus: nextStatus,
        createdAt: nowIso,
      },
    });
  }

  async deleteListing(listingId: string, actorUid: string): Promise<void> {
    const listing = await adoptionListingRepo.getListingById(listingId);
    if (!listing) throw new Error('Listing not found.');
    if (listing.listerUid !== actorUid) {
      throw new Error('Unauthorized: You can only delete your own listings.');
    }

    await adoptionListingRepo.deleteListingAtomic({
      listingId,
      fingerprint: listing.duplicateFingerprint,
      auditLog: {
        id: `listing_${listingId}_deleted_${Date.now()}`,
        listingId,
        actorUid,
        actorRole: 'lister',
        action: 'LISTING_DELETED',
        fromStatus: listing.status,
        toStatus: 'deleted',
        createdAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Checks a lister's active listings for 50-day reminder & 60-day auto-hide rules.
   */
  async processInactivityForOwner(listerUid: string): Promise<AdoptionListing[]> {
    const listings = await adoptionListingRepo.getListingsByOwner(listerUid);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    for (const item of listings) {
      const evaluation = evaluateListingInactivity(item, nowMs);

      if (evaluation.shouldAutoHide) {
        await adoptionListingRepo.updateListingFieldsWithAudit({
          listingId: item.id,
          updates: {
            status: LISTING_STATUS.EXPIRED_HIDDEN,
            moderationReason: 'Automatically hidden after 60 days without activity.',
            updatedAt: nowIso,
          },
          auditLog: {
            id: `listing_${item.id}_autohide_${nowMs}`,
            listingId: item.id,
            actorUid: listerUid,
            actorRole: 'system',
            action: 'AUTO_HIDDEN_60_DAY_INACTIVITY',
            fromStatus: item.status,
            toStatus: LISTING_STATUS.EXPIRED_HIDDEN,
            createdAt: nowIso,
          },
          notification: {
            recipientUid: listerUid,
            id: `autohide_${item.id}`,
            type: 'status_update',
            message: `${item.name}'s adoption listing was hidden after 60 days of inactivity. You can renew it from My Listings.`,
            listingId: item.id,
            petName: item.name,
          },
        });
        item.status = LISTING_STATUS.EXPIRED_HIDDEN;
      } else if (evaluation.needsReminder) {
        await adoptionListingRepo.updateListingFieldsWithAudit({
          listingId: item.id,
          updates: {
            inactivityReminderSentAt: nowIso,
            updatedAt: nowIso,
          },
          auditLog: {
            id: `listing_${item.id}_reminder_${nowMs}`,
            listingId: item.id,
            actorUid: listerUid,
            actorRole: 'system',
            action: 'INACTIVITY_REMINDER_SENT',
            fromStatus: item.status,
            toStatus: item.status,
            createdAt: nowIso,
          },
          notification: {
            recipientUid: listerUid,
            id: `inactivity_reminder_${item.id}`,
            type: 'status_update',
            message: `Reminder: ${item.name}'s listing will be hidden in ${evaluation.daysUntilAutoHide} days unless you confirm it is still active.`,
            listingId: item.id,
            petName: item.name,
          },
        });
        item.inactivityReminderSentAt = nowIso;
      }
    }

    return listings;
  }

  async fetchPublicListings(
    filters: ListingFilterCriteria = {},
    pageSize: number = 12,
    startAfterDoc: DocumentSnapshot | null = null
  ): Promise<FetchListingsResult> {
    return adoptionListingRepo.fetchPublicListings(filters, pageSize, startAfterDoc);
  }

  async getListingById(listingId: string): Promise<AdoptionListing | null> {
    return adoptionListingRepo.getListingById(listingId);
  }

  subscribeToListing(
    listingId: string,
    onUpdate: (listing: AdoptionListing | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    return adoptionListingRepo.subscribeToListing(listingId, onUpdate, onError);
  }
}

export const adoptionListingService = new AdoptionListingService();
