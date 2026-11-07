/**
 * Firebase Firestore Implementation of Donation Repository
 * Atomic batches for creation, strict transactions with optimistic concurrency
 * for status updates, and reference uniqueness guards.
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import type { Donation, ShelterPayInfo, DonationAuditEntry } from '../domain/donationEntities.js';
import type { DonationReader, DonationWriter } from '../domain/donationInterfaces.js';
import type { DonationStatus } from '../config/donationConfig.js';
import {
  DonationNotFoundError,
  DuplicateReferenceError,
  DonationStateError,
} from '../domain/donationErrors.js';
import { StaleVersionError } from '../domain/shelterErrors.js';

export class FirebaseDonationRepository implements DonationReader, DonationWriter {
  private readonly donationsCol = 'donations';
  private readonly referencesCol = 'donationReferences';
  private readonly shelterPayInfoCol = 'shelterPayInfo';
  private readonly auditCol = 'donationAuditLogs';

  async getDonationById(id: string): Promise<Donation | null> {
    const snap = await getDoc(doc(db, this.donationsCol, id));
    if (!snap.exists()) return null;
    return snap.data() as Donation;
  }

  async getDonationByReference(reference: string): Promise<Donation | null> {
    const q = query(
      collection(db, this.donationsCol),
      where('reference', '==', reference)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Donation;
  }

  async getDonationsByDonor(donorUid: string): Promise<readonly Donation[]> {
    const q = query(
      collection(db, this.donationsCol),
      where('donorUid', '==', donorUid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Donation);
  }

  async getDonationsByShelter(shelterId: string): Promise<readonly Donation[]> {
    const q = query(
      collection(db, this.donationsCol),
      where('shelterId', '==', shelterId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Donation);
  }

  async getShelterPayInfo(shelterId: string): Promise<ShelterPayInfo | null> {
    const snap = await getDoc(doc(db, this.shelterPayInfoCol, shelterId));
    if (!snap.exists()) return null;
    return snap.data() as ShelterPayInfo;
  }

  async saveShelterPayInfo(payInfo: ShelterPayInfo): Promise<void> {
    await runTransaction(db, async (txn) => {
      const payInfoRef = doc(db, this.shelterPayInfoCol, payInfo.shelterId);
      txn.set(payInfoRef, {
        ...payInfo,
        updatedAt: Date.now(),
      });
    });
  }

  async createDonation(params: {
    donation: Donation;
    audit: DonationAuditEntry;
  }): Promise<void> {
    const { donation, audit } = params;

    // First verify reference doesn't already exist
    const refDoc = doc(db, this.referencesCol, donation.reference);
    const refSnap = await getDoc(refDoc);
    if (refSnap.exists()) {
      throw new DuplicateReferenceError(donation.reference);
    }

    const batch = writeBatch(db);

    // 1. Write donation document
    const donationRef = doc(db, this.donationsCol, donation.id);
    batch.set(donationRef, {
      ...donation,
      createdAt: typeof donation.createdAt === 'number' ? donation.createdAt : Date.now(),
      expiresAt: typeof donation.expiresAt === 'number' ? donation.expiresAt : Date.now(),
      updatedAt: Date.now(),
    });

    // 2. Write unique reference guard
    batch.set(refDoc, {
      donationId: donation.id,
      donorUid: donation.donorUid,
      createdAt: Date.now(),
    });

    // 3. Write audit log entry
    const auditDocRef = doc(collection(db, this.auditCol));
    batch.set(auditDocRef, {
      ...audit,
      timestamp: Date.now(),
    });

    await batch.commit();
  }

  async updateDonationStatus(params: {
    donationId: string;
    expectedVersion: number;
    newStatus: DonationStatus;
    reason?: string;
    audit: DonationAuditEntry;
  }): Promise<Donation> {
    const { donationId, expectedVersion, newStatus, reason, audit } = params;

    return await runTransaction(db, async (txn) => {
      const donationRef = doc(db, this.donationsCol, donationId);
      const snap = await txn.get(donationRef);

      if (!snap.exists()) {
        throw new DonationNotFoundError(donationId);
      }

      const current = snap.data() as Donation;

      if (current.statusVersion !== expectedVersion) {
        throw new StaleVersionError(expectedVersion, current.statusVersion);
      }

      const updated: Donation = {
        ...current,
        status: newStatus,
        statusReason: reason || current.statusReason,
        statusVersion: current.statusVersion + 1,
        updatedAt: Date.now(),
      };

      txn.update(donationRef, {
        status: updated.status,
        statusReason: updated.statusReason,
        statusVersion: updated.statusVersion,
        updatedAt: updated.updatedAt,
      });

      // Write audit log inside the same transaction
      const auditDocRef = doc(collection(db, this.auditCol));
      txn.set(auditDocRef, {
        ...audit,
        fromStatus: current.status,
        toStatus: newStatus,
        timestamp: Date.now(),
      });

      return updated;
    });
  }
}
