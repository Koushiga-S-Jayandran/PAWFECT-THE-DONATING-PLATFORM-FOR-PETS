/**
 * Adoption Interest & Contact Reveal Service
 * Handles "I'm interested" submissions, lister accept/decline actions,
 * and strict private phone reveal ONLY to accepted adopters.
 */

import { REQUEST_STATUS, type ListingHousingType } from '../config/adoptionListingConfig.js';
import type {
  AdoptionListing,
  AdoptionInterestRequest,
} from '../domain/adoptionListingEntities.js';
import { canRevealListerPhone } from '../domain/listingLifecycle.js';
import { interestRequestSchema } from '../security/adoptionListingValidation.js';
import { adoptionListingRepo } from '../repositories/FirebaseAdoptionListingRepository.js';

export class AdoptionInterestService {
  getDeterministicRequestId(adopterUid: string, listingId: string): string {
    return `${adopterUid}_${listingId}`;
  }

  async submitInterest(params: {
    listing: AdoptionListing;
    adopterUid: string;
    adopterEmail: string;
    name: string;
    housingType: ListingHousingType;
    experience: string;
    reason: string;
  }): Promise<{ requestId: string }> {
    const parsed = interestRequestSchema.parse({
      name: params.name,
      housingType: params.housingType,
      experience: params.experience,
      reason: params.reason,
    });

    const requestId = this.getDeterministicRequestId(params.adopterUid, params.listing.id);
    const nowIso = new Date().toISOString();

    const request: AdoptionInterestRequest = {
      id: requestId,
      petId: params.listing.id,
      listingId: params.listing.id,
      petName: params.listing.name,
      shelterId: params.listing.listerUid,
      listerUid: params.listing.listerUid,
      adopterId: params.adopterUid,
      adopterName: parsed.name,
      adopterEmail: params.adopterEmail,
      reason: parsed.reason,
      housingType: parsed.housingType,
      experience: parsed.experience,
      ownsHome: parsed.housingType.startsWith('own_'),
      landlordPermission: true,
      hasYard: false,
      hasOtherPets: false,
      status: REQUEST_STATUS.PENDING,
      statusUpdatedAt: nowIso,
      createdAt: nowIso,
    };

    await adoptionListingRepo.submitInterestTransaction(request, params.listing.name);
    return { requestId };
  }

  async getMyRequestForListing(
    adopterUid: string,
    listingId: string
  ): Promise<AdoptionInterestRequest | null> {
    const reqId = this.getDeterministicRequestId(adopterUid, listingId);
    return adoptionListingRepo.getInterestRequestById(reqId);
  }

  async getRequestsForLister(listerUid: string): Promise<AdoptionInterestRequest[]> {
    return adoptionListingRepo.getInterestRequestsForLister(listerUid);
  }

  async decideInterest(params: {
    request: AdoptionInterestRequest;
    listerUid: string;
    decision: 'approved' | 'rejected';
    reason?: string;
  }): Promise<void> {
    if (params.request.listerUid !== params.listerUid && params.request.shelterId !== params.listerUid) {
      throw new Error('Unauthorized: Only the listing owner can accept or decline inquiries.');
    }
    if (params.request.status !== REQUEST_STATUS.PENDING) {
      throw new Error(`This request has already been marked "${params.request.status}".`);
    }

    await adoptionListingRepo.decideInterestRequest({
      request: params.request,
      decision: params.decision,
      reason: params.reason?.trim(),
      auditLog: {
        id: `req_${params.request.id}_${params.decision}_${Date.now()}`,
        listingId: params.request.listingId,
        actorUid: params.listerUid,
        actorRole: 'lister',
        action:
          params.decision === 'approved'
            ? 'ADOPTER_INTEREST_ACCEPTED'
            : 'ADOPTER_INTEREST_DECLINED',
        fromStatus: params.request.status,
        toStatus: params.decision,
        reason: params.reason?.trim(),
        createdAt: new Date().toISOString(),
      },
    });
  }

  async getProtectedPhoneIfAuthorized(params: {
    listing: AdoptionListing;
    viewerUid: string | null | undefined;
    isAdmin?: boolean;
    adopterRequest?: AdoptionInterestRequest | null;
  }): Promise<string | null> {
    const allowed = canRevealListerPhone({
      viewerUid: params.viewerUid,
      listerUid: params.listing.listerUid,
      isAdmin: params.isAdmin,
      adopterRequestStatus: params.adopterRequest?.status ?? null,
    });
    if (!allowed) return null;

    const privateContact = await adoptionListingRepo.getPrivateContact(params.listing.id);
    return privateContact?.phone || null;
  }
}

export const adoptionInterestService = new AdoptionInterestService();
