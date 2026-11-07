/**
 * Shelter Payment Review Service
 * Manages shelter inbox queries, verification checks, and confirmation/rejection actions.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import type {
  DonationProof,
  EnhancedDonation,
  Step2BDonationStatus,
} from '../domain/proofEntities.js';
import type { FirebaseProofRepository } from '../repositories/FirebaseProofRepository.js';
import { OVERDUE_HOURS_MS } from '../security/flagCalculator.js';

export interface ShelterInboxItem {
  readonly donation: EnhancedDonation;
  readonly proof: DonationProof | null;
  readonly donorFirstName: string;
  readonly isOverdue: boolean;
}

export class ShelterPaymentReviewService {
  constructor(private readonly proofRepo: FirebaseProofRepository) {}

  async getShelterDonations(
    shelterId: string,
    statusFilter?: Step2BDonationStatus
  ): Promise<ShelterInboxItem[]> {
    const constraints = [
      where('shelterId', '==', shelterId),
    ];

    if (statusFilter) {
      constraints.push(where('status', '==', statusFilter));
    }

    const q = query(collection(db, 'donations'), ...constraints);
    const snap = await getDocs(q);

    const now = Date.now();
    const items: ShelterInboxItem[] = [];

    for (const docSnap of snap.docs) {
      const donation = docSnap.data() as EnhancedDonation;
      const donorFirstName = (donation.donorName || 'Donor').trim().split(/\s+/)[0] || 'Donor';
      const proof = await this.proofRepo.getLatestProofForDonation(donation.id);

      const isOverdue = Boolean(
        donation.status === 'PROOF_SUBMITTED' &&
          donation.proofSubmittedAt &&
          now - donation.proofSubmittedAt >= OVERDUE_HOURS_MS
      );

      items.push({
        donation,
        proof,
        donorFirstName,
        isOverdue,
      });
    }

    // Sort: newest first
    return items.sort((a, b) => {
      const aTime = a.donation.proofSubmittedAt || a.donation.createdAt || 0;
      const bTime = b.donation.proofSubmittedAt || b.donation.createdAt || 0;
      return Number(bTime) - Number(aTime);
    });
  }

  async confirmPayment(params: {
    donationId: string;
    shelterId: string;
    expectedVersion: number;
    actorUid: string;
  }): Promise<EnhancedDonation> {
    return this.proofRepo.confirmShelterPayment(params);
  }

  async rejectPayment(params: {
    donationId: string;
    shelterId: string;
    expectedVersion: number;
    reason: string;
    actorUid: string;
  }): Promise<EnhancedDonation> {
    return this.proofRepo.rejectShelterPayment(params);
  }
}
