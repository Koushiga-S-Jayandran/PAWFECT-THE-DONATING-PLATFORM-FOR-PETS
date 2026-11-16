/**
 * Firebase Adoption Listing Repository
 * Handles Firestore CRUD, atomic batch commits, real cursor pagination,
 * private contact isolation, duplicate locks, rate limits, reports, and audit logs.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  onSnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase.js';
import { LISTING_STATUS, type ListingStatus } from '../config/adoptionListingConfig.js';
import type {
  AdoptionListing,
  ListingPrivateContact,
  AdoptionInterestRequest,
  ListingReport,
  ListingAuditLog,
  ListingFilterCriteria,
} from '../domain/adoptionListingEntities.js';

export interface FetchListingsResult {
  listings: AdoptionListing[];
  lastVisibleDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

function mapListingDoc(id: string, d: Record<string, any>): AdoptionListing {
  return {
    id,
    listerUid: d.listerUid || '',
    listerType: d.listerType === 'shelter' ? 'shelter' : 'individual',
    shelterId: d.shelterId || undefined,
    shelterName: d.shelterName || undefined,
    verifiedShelter: Boolean(d.verifiedShelter),
    name: d.name || 'Unnamed',
    isUnnamed: Boolean(d.isUnnamed),
    species: d.species === 'cat' || d.species === 'other' ? d.species : 'dog',
    breed: d.breed || 'Indie / Mixed',
    ageMonths: Number.isFinite(Number(d.ageMonths)) ? Number(d.ageMonths) : 0,
    gender: d.gender === 'female' || d.gender === 'unknown' ? d.gender : 'male',
    size: d.size === 'small' || d.size === 'large' ? d.size : 'medium',
    color: d.color || '',
    vaccinated: Boolean(d.vaccinated),
    sterilised: Boolean(d.sterilised),
    injuriesOrConditions: d.injuriesOrConditions || '',
    temperament: Array.isArray(d.temperament) ? d.temperament : [],
    goodWithKids: d.goodWithKids === 'yes' || d.goodWithKids === 'no' ? d.goodWithKids : 'unknown',
    goodWithOtherPets:
      d.goodWithOtherPets === 'yes' || d.goodWithOtherPets === 'no'
        ? d.goodWithOtherPets
        : 'unknown',
    photos: Array.isArray(d.photos) ? d.photos : [],
    story: d.story || '',
    stateCode: d.stateCode || '',
    stateName: d.stateName || '',
    district: d.district || '',
    city: d.city || '',
    contactName: d.contactName || '',
    revealOnlyToApproved: d.revealOnlyToApproved !== false,
    phoneVerified: Boolean(d.phoneVerified),
    status: (d.status || LISTING_STATUS.PENDING) as ListingStatus,
    wasPreviouslyApproved: Boolean(d.wasPreviouslyApproved),
    moderationReason: d.moderationReason || undefined,
    moderatedBy: d.moderatedBy || undefined,
    moderatedAt: d.moderatedAt || undefined,
    duplicateFingerprint: d.duplicateFingerprint || '',
    lastActivityAt: d.lastActivityAt || d.createdAt || new Date().toISOString(),
    expiresAt: d.expiresAt || new Date().toISOString(),
    inactivityReminderSentAt: d.inactivityReminderSentAt || undefined,
    adoptedAt: d.adoptedAt || undefined,
    createdAt: d.createdAt || new Date().toISOString(),
    updatedAt: d.updatedAt || new Date().toISOString(),
  };
}

export class FirebaseAdoptionListingRepository {
  /**
   * Fetch public approved (or adopted for Happy Tails) listings with real Firestore startAfter cursor pagination.
   */
  async fetchPublicListings(
    filters: ListingFilterCriteria = {},
    pageSize: number = 12,
    startAfterDoc: DocumentSnapshot | null = null
  ): Promise<FetchListingsResult> {
    const colRef = collection(db, 'adoptionListings');
    const targetStatus = filters.includeAdopted ? LISTING_STATUS.ADOPTED : LISTING_STATUS.APPROVED;

    try {
      const batchLimit = Math.max(pageSize * 3, 36);
      const constraints: any[] = [
        where('status', '==', targetStatus),
        orderBy('createdAt', 'desc'),
      ];
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }
      constraints.push(limit(batchLimit));

      let snapshot;
      try {
        snapshot = await getDocs(query(colRef, ...constraints));
      } catch (err: any) {
        // Index fallback if composite index is still building
        if (err?.message?.includes('index') || err?.code === 'failed-precondition') {
          const fallbackConstraints: any[] = [where('status', '==', targetStatus)];
          if (startAfterDoc) {
            fallbackConstraints.push(startAfter(startAfterDoc));
          }
          fallbackConstraints.push(limit(batchLimit));
          snapshot = await getDocs(query(colRef, ...fallbackConstraints));
        } else {
          throw err;
        }
      }

      let items = snapshot.docs.map((d) => mapListingDoc(d.id, d.data()));

      if (filters.species) {
        items = items.filter((p) => p.species === filters.species);
      }
      if (filters.stateCode) {
        items = items.filter((p) => p.stateCode === filters.stateCode);
      }
      if (filters.district) {
        const dLower = filters.district.toLowerCase();
        items = items.filter((p) => p.district.toLowerCase() === dLower);
      }
      if (filters.gender) {
        items = items.filter((p) => p.gender === filters.gender);
      }
      if (filters.size) {
        items = items.filter((p) => p.size === filters.size);
      }
      if (filters.vaccinated !== undefined) {
        items = items.filter((p) => p.vaccinated === filters.vaccinated);
      }
      if (filters.ageRange) {
        items = items.filter((p) => {
          if (filters.ageRange === 'puppy_kitten') return p.ageMonths < 12;
          if (filters.ageRange === 'young') return p.ageMonths >= 12 && p.ageMonths <= 36;
          if (filters.ageRange === 'adult') return p.ageMonths > 36 && p.ageMonths <= 96;
          if (filters.ageRange === 'senior') return p.ageMonths > 96;
          return true;
        });
      }
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const qTerm = filters.searchQuery.toLowerCase().trim();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(qTerm) ||
            p.breed.toLowerCase().includes(qTerm) ||
            p.story.toLowerCase().includes(qTerm) ||
            p.city.toLowerCase().includes(qTerm) ||
            p.district.toLowerCase().includes(qTerm) ||
            (p.shelterName || '').toLowerCase().includes(qTerm)
        );
      }

      if (filters.sortBy === 'youngest') {
        items.sort((a, b) => a.ageMonths - b.ageMonths);
      } else if (filters.sortBy === 'oldest') {
        items.sort((a, b) => b.ageMonths - a.ageMonths);
      } else {
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      const paged = items.slice(0, pageSize);
      const hasMore = snapshot.docs.length === batchLimit || items.length > pageSize;
      const lastVisibleDoc =
        paged.length > 0
          ? snapshot.docs.find((d) => d.id === paged[paged.length - 1].id) ||
            snapshot.docs[snapshot.docs.length - 1] ||
            null
          : null;

      return { listings: paged, lastVisibleDoc, hasMore };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'adoptionListings');
    }
  }

  async getListingById(listingId: string): Promise<AdoptionListing | null> {
    try {
      const snap = await getDoc(doc(db, 'adoptionListings', listingId));
      if (!snap.exists()) return null;
      return mapListingDoc(snap.id, snap.data());
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `adoptionListings/${listingId}`);
    }
  }

  subscribeToListing(
    listingId: string,
    onUpdate: (listing: AdoptionListing | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    return onSnapshot(
      doc(db, 'adoptionListings', listingId),
      (snap) => {
        if (!snap.exists()) {
          onUpdate(null);
          return;
        }
        onUpdate(mapListingDoc(snap.id, snap.data()));
      },
      (err) => {
        onError?.(err);
      }
    );
  }

  async getListingsByOwner(listerUid: string): Promise<AdoptionListing[]> {
    try {
      const q = query(
        collection(db, 'adoptionListings'),
        where('listerUid', '==', listerUid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => mapListingDoc(d.id, d.data()));
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'adoptionListings');
    }
  }

  async getAllListingsForAdmin(): Promise<AdoptionListing[]> {
    try {
      const snap = await getDocs(collection(db, 'adoptionListings'));
      const list = snap.docs.map((d) => mapListingDoc(d.id, d.data()));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'adoptionListings');
    }
  }

  async getPrivateContact(listingId: string): Promise<ListingPrivateContact | null> {
    try {
      const snap = await getDoc(doc(db, 'adoptionListings', listingId, 'private', 'contact'));
      if (!snap.exists()) return null;
      return snap.data() as ListingPrivateContact;
    } catch {
      // Rules intentionally deny unauthorized readers
      return null;
    }
  }

  async getDailyRateLimitDoc(uid: string): Promise<{ dateKey: string; count: number } | null> {
    const snap = await getDoc(doc(db, 'listingRateLimits', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { dateKey: d.dateKey || '', count: Number(d.count) || 0 };
  }

  async hasDuplicateFingerprint(hash: string): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, 'listingDuplicates', hash));
      return snap.exists();
    } catch {
      return false;
    }
  }

  async createListingAtomic(params: {
    listing: AdoptionListing;
    privateContact: ListingPrivateContact;
    rateLimit: { uid: string; dateKey: string; nextCount: number };
    auditLog: ListingAuditLog;
  }): Promise<void> {
    const { listing, privateContact, rateLimit, auditLog } = params;
    const batch = writeBatch(db);

    batch.set(doc(db, 'adoptionListings', listing.id), listing);
    batch.set(doc(db, 'adoptionListings', listing.id, 'private', 'contact'), privateContact);
    batch.set(doc(db, 'listingDuplicates', listing.duplicateFingerprint), {
      listingId: listing.id,
      listerUid: listing.listerUid,
      createdAt: listing.createdAt,
    });
    batch.set(doc(db, 'listingRateLimits', rateLimit.uid), {
      dateKey: rateLimit.dateKey,
      count: rateLimit.nextCount,
      updatedAt: listing.createdAt,
    });
    batch.set(doc(db, 'auditLogs', auditLog.id), auditLog);

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `adoptionListings/${listing.id}`);
    }
  }

  async updateListingAtomic(params: {
    listingId: string;
    oldFingerprint: string;
    newFingerprint: string;
    listingUpdates: Record<string, any>;
    privateContactUpdates: Partial<ListingPrivateContact>;
    auditLog: ListingAuditLog;
  }): Promise<void> {
    const {
      listingId,
      oldFingerprint,
      newFingerprint,
      listingUpdates,
      privateContactUpdates,
      auditLog,
    } = params;

    const batch = writeBatch(db);
    batch.update(doc(db, 'adoptionListings', listingId), listingUpdates);
    batch.update(
      doc(db, 'adoptionListings', listingId, 'private', 'contact'),
      privateContactUpdates
    );

    if (oldFingerprint && newFingerprint && oldFingerprint !== newFingerprint) {
      batch.delete(doc(db, 'listingDuplicates', oldFingerprint));
      batch.set(doc(db, 'listingDuplicates', newFingerprint), {
        listingId,
        listerUid: privateContactUpdates.listerUid || '',
        createdAt: new Date().toISOString(),
      });
    }

    batch.set(doc(db, 'auditLogs', auditLog.id), auditLog);

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `adoptionListings/${listingId}`);
    }
  }

  async updateListingFieldsWithAudit(params: {
    listingId: string;
    updates: Partial<AdoptionListing>;
    auditLog: ListingAuditLog;
    notification?: {
      recipientUid: string;
      id: string;
      type: string;
      message: string;
      listingId: string;
      petName: string;
    };
  }): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, 'adoptionListings', params.listingId), params.updates);
    batch.set(doc(db, 'auditLogs', params.auditLog.id), params.auditLog);

    if (params.notification) {
      const n = params.notification;
      batch.set(doc(db, 'users', n.recipientUid, 'notifications', n.id), {
        type: n.type,
        message: n.message,
        requestId: n.listingId,
        petId: n.listingId,
        petName: n.petName,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `adoptionListings/${params.listingId}`);
    }
  }

  async deleteListingAtomic(params: {
    listingId: string;
    fingerprint: string;
    auditLog: ListingAuditLog;
  }): Promise<void> {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'adoptionListings', params.listingId, 'private', 'contact'));
    batch.delete(doc(db, 'adoptionListings', params.listingId));
    if (params.fingerprint) {
      batch.delete(doc(db, 'listingDuplicates', params.fingerprint));
    }
    batch.set(doc(db, 'auditLogs', params.auditLog.id), params.auditLog);

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `adoptionListings/${params.listingId}`);
    }
  }

  // Interest requests for listers & adopters
  async getInterestRequestsForLister(listerUid: string): Promise<AdoptionInterestRequest[]> {
    try {
      const q = query(
        collection(db, 'adoptionRequests'),
        where('shelterId', '==', listerUid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdoptionInterestRequest);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'adoptionRequests');
    }
  }

  async getInterestRequestById(requestId: string): Promise<AdoptionInterestRequest | null> {
    try {
      const snap = await getDoc(doc(db, 'adoptionRequests', requestId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as AdoptionInterestRequest;
    } catch {
      return null;
    }
  }

  async submitInterestTransaction(request: AdoptionInterestRequest, listingName: string): Promise<void> {
    const reqRef = doc(db, 'adoptionRequests', request.id);
    const listingRef = doc(db, 'adoptionListings', request.listingId);

    await runTransaction(db, async (tx) => {
      const listingSnap = await tx.get(listingRef);
      if (!listingSnap.exists()) {
        throw new Error('This listing is no longer available.');
      }
      const listingData = listingSnap.data();
      if (listingData.status !== LISTING_STATUS.APPROVED) {
        throw new Error('This animal is currently not accepting new adoption inquiries.');
      }
      if (listingData.listerUid === request.adopterId) {
        throw new Error('You cannot submit an adoption interest on your own listing.');
      }

      const existingSnap = await tx.get(reqRef);
      if (existingSnap.exists()) {
        const st = existingSnap.data()?.status;
        if (st === 'pending' || st === 'approved') {
          throw new Error('You have already expressed interest in this animal.');
        }
      }

      tx.set(reqRef, request);
      const notifId = `interest_${request.id}_${Date.now()}`;
      tx.set(doc(db, 'users', request.listerUid, 'notifications', notifId), {
        type: 'status_update',
        message: `${request.adopterName} is interested in adopting ${listingName}. Review their application in My Listings.`,
        requestId: request.id,
        petId: request.listingId,
        petName: listingName,
        read: false,
        createdAt: request.createdAt,
      });
    });
  }

  async decideInterestRequest(params: {
    request: AdoptionInterestRequest;
    decision: 'approved' | 'rejected';
    reason?: string;
    auditLog: ListingAuditLog;
  }): Promise<void> {
    const { request, decision, reason, auditLog } = params;
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    batch.update(doc(db, 'adoptionRequests', request.id), {
      status: decision,
      statusReason: reason || '',
      statusUpdatedAt: now,
    });

    const notifId = `req_${request.id}_${decision}`;
    batch.set(doc(db, 'users', request.adopterId, 'notifications', notifId), {
      type: decision === 'approved' ? 'adoption_approved' : 'adoption_rejected',
      message:
        decision === 'approved'
          ? `Great news! Your adoption interest for ${request.petName} was accepted. The lister's phone number is now unlocked on the listing page.`
          : `Update on ${request.petName}: ${reason || 'The lister selected another match.'}`,
      requestId: request.id,
      petId: request.listingId,
      petName: request.petName,
      read: false,
      createdAt: now,
    });

    batch.set(doc(db, 'auditLogs', auditLog.id), auditLog);
    await batch.commit();
  }

  // Reports & Admin Audit Logs
  async createListingReport(report: ListingReport): Promise<void> {
    const reportRef = doc(db, 'listingReports', report.id);
    const existing = await getDoc(reportRef);
    if (existing.exists()) {
      throw new Error('You have already reported this listing.');
    }
    const batch = writeBatch(db);
    batch.set(reportRef, report);
    batch.set(doc(db, 'auditLogs', `report_${report.id}`), {
      id: `report_${report.id}`,
      listingId: report.listingId,
      actorUid: report.reporterUid,
      actorRole: 'adopter',
      action: 'LISTING_REPORTED',
      toStatus: report.reason,
      reason: report.details,
      createdAt: report.createdAt,
    });
    await batch.commit();
  }

  async getAllReportsForAdmin(): Promise<ListingReport[]> {
    const snap = await getDocs(collection(db, 'listingReports'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ListingReport);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  async resolveReport(params: {
    report: ListingReport;
    adminUid: string;
    resolution: 'resolved_dismissed' | 'resolved_removed';
    note: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.update(doc(db, 'listingReports', params.report.id), {
      status: params.resolution,
      resolutionNote: params.note,
      resolvedBy: params.adminUid,
      resolvedAt: now,
    });

    if (params.resolution === 'resolved_removed') {
      batch.update(doc(db, 'adoptionListings', params.report.listingId), {
        status: LISTING_STATUS.REJECTED,
        moderationReason: params.note,
        moderatedBy: params.adminUid,
        moderatedAt: now,
        updatedAt: now,
      });
      batch.set(
        doc(
          db,
          'users',
          params.report.listerUid,
          'notifications',
          `report_removed_${params.report.listingId}_${Date.now()}`
        ),
        {
          type: 'status_update',
          message: `Your listing for ${params.report.listingName} was removed following a safety review: ${params.note}`,
          requestId: params.report.listingId,
          petId: params.report.listingId,
          petName: params.report.listingName,
          read: false,
          createdAt: now,
        }
      );
    }

    batch.set(doc(db, 'auditLogs', `resolve_${params.report.id}_${Date.now()}`), {
      id: `resolve_${params.report.id}_${Date.now()}`,
      listingId: params.report.listingId,
      actorUid: params.adminUid,
      actorRole: 'admin',
      action:
        params.resolution === 'resolved_removed'
          ? 'REPORT_LISTING_REMOVED'
          : 'REPORT_DISMISSED',
      toStatus: params.resolution,
      reason: params.note,
      createdAt: now,
    });

    await batch.commit();
  }

  async getRecentListingAuditLogs(maxCount: number = 60): Promise<ListingAuditLog[]> {
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ListingAuditLog)
      .filter((entry) => Boolean(entry.listingId));
  }
}

export const adoptionListingRepo = new FirebaseAdoptionListingRepository();
