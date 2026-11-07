/**
 * In-Memory Proof Repository for Tests
 */

import type {
  DonationProof,
  EnhancedDonation,
  Step2BDonationAuditEntry,
} from '../domain/proofEntities.js';
import type {
  ProofReader,
  ProofWriter,
  UtrRegistry,
  HashRegistry,
  SubmitProofBatchParams,
} from '../domain/proofInterfaces.js';
import {
  UtrAlreadyUsedError,
  StaleVersionError,
  NotAuthorizedError,
  IllegalTransitionError,
} from '../domain/proofErrors.js';

export class InMemoryProofRepository
  implements ProofReader, ProofWriter, UtrRegistry, HashRegistry
{
  private proofs = new Map<string, DonationProof>();
  private utrs = new Set<string>();
  private hashes = new Set<string>();
  private donations = new Map<string, EnhancedDonation>();
  private audits: Step2BDonationAuditEntry[] = [];

  setDonation(donation: EnhancedDonation): void {
    this.donations.set(donation.id, donation);
  }

  getDonation(id: string): EnhancedDonation | undefined {
    return this.donations.get(id);
  }

  async isUtrUsed(utr: string): Promise<boolean> {
    return this.utrs.has(utr);
  }

  async isHashPresent(hash: string): Promise<boolean> {
    return this.hashes.has(hash);
  }

  async getProofById(id: string): Promise<DonationProof | null> {
    return this.proofs.get(id) || null;
  }

  async getProofsForDonation(donationId: string): Promise<DonationProof[]> {
    return Array.from(this.proofs.values())
      .filter((p) => p.donationId === donationId)
      .sort((a, b) => a.attempt - b.attempt);
  }

  async getLatestProofForDonation(
    donationId: string
  ): Promise<DonationProof | null> {
    const list = await this.getProofsForDonation(donationId);
    return list.length ? list[list.length - 1] : null;
  }

  async submitProofAtomic(params: SubmitProofBatchParams): Promise<void> {
    const { donation, proof, newStatusVersion, isNewHash, audit } = params;

    if (this.utrs.has(proof.utr)) {
      throw new UtrAlreadyUsedError();
    }

    this.utrs.add(proof.utr);
    if (isNewHash) {
      this.hashes.add(proof.imageHash);
    }

    this.proofs.set(proof.id, proof);

    const updatedDonation: EnhancedDonation = {
      ...donation,
      status: 'PROOF_SUBMITTED',
      statusVersion: newStatusVersion,
      proofSubmittedAt: Date.now(),
      latestProofAttempt: proof.attempt,
      updatedAt: Date.now(),
    };
    this.donations.set(donation.id, updatedDonation);
    this.audits.push(audit);
  }

  async confirmShelterPayment(params: {
    donationId: string;
    shelterId: string;
    expectedVersion: number;
    actorUid: string;
  }): Promise<EnhancedDonation> {
    const { donationId, shelterId, expectedVersion, actorUid } = params;
    const donation = this.donations.get(donationId);
    if (!donation) throw new Error('Donation not found');

    if (donation.statusVersion !== expectedVersion) {
      throw new StaleVersionError();
    }

    if (donation.shelterId !== shelterId || actorUid !== shelterId) {
      throw new NotAuthorizedError(
        'You can only confirm payments for your own shelter.'
      );
    }

    if (donation.donorUid === actorUid) {
      throw new NotAuthorizedError(
        'Shelter owners cannot confirm their own donations.'
      );
    }

    if (donation.status !== 'PROOF_SUBMITTED') {
      throw new IllegalTransitionError(
        donation.status,
        'CONFIRMED',
        'Only donations with submitted proof can be confirmed.'
      );
    }

    const nextVersion = donation.statusVersion + 1;
    const updated: EnhancedDonation = {
      ...donation,
      status: 'CONFIRMED',
      statusVersion: nextVersion,
      confirmedAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.donations.set(donationId, updated);
    this.audits.push({
      donationId,
      reference: donation.reference,
      fromStatus: 'PROOF_SUBMITTED',
      toStatus: 'CONFIRMED',
      actorUid,
      actorType: 'SHELTER',
      timestamp: Date.now(),
    });

    return updated;
  }

  async rejectShelterPayment(params: {
    donationId: string;
    shelterId: string;
    expectedVersion: number;
    reason: string;
    actorUid: string;
  }): Promise<EnhancedDonation> {
    const { donationId, shelterId, expectedVersion, reason, actorUid } = params;
    const donation = this.donations.get(donationId);
    if (!donation) throw new Error('Donation not found');

    if (donation.statusVersion !== expectedVersion) {
      throw new StaleVersionError();
    }

    if (donation.shelterId !== shelterId || actorUid !== shelterId) {
      throw new NotAuthorizedError(
        'You can only reject payments for your own shelter.'
      );
    }

    if (donation.status !== 'PROOF_SUBMITTED') {
      throw new IllegalTransitionError(
        donation.status,
        'REJECTED',
        'Only donations with submitted proof can be rejected.'
      );
    }

    const nextVersion = donation.statusVersion + 1;
    const nextRejectionCount = (donation.rejectionCount || 0) + 1;

    const updated: EnhancedDonation = {
      ...donation,
      status: 'REJECTED',
      statusVersion: nextVersion,
      rejectionReason: reason.trim(),
      rejectionCount: nextRejectionCount,
      updatedAt: Date.now(),
    };

    this.donations.set(donationId, updated);
    this.audits.push({
      donationId,
      reference: donation.reference,
      fromStatus: 'PROOF_SUBMITTED',
      toStatus: 'REJECTED',
      actorUid,
      actorType: 'SHELTER',
      reason: reason.trim(),
      timestamp: Date.now(),
    });

    return updated;
  }

  async disputeDonation(params: {
    donationId: string;
    expectedVersion: number;
    actorUid: string;
  }): Promise<EnhancedDonation> {
    const { donationId, expectedVersion, actorUid } = params;
    const donation = this.donations.get(donationId);
    if (!donation) throw new Error('Donation not found');

    if (donation.statusVersion !== expectedVersion) {
      throw new StaleVersionError();
    }

    if (donation.donorUid !== actorUid) {
      throw new NotAuthorizedError(
        'Only the donor can dispute this donation.'
      );
    }

    if (donation.status !== 'REJECTED') {
      throw new IllegalTransitionError(
        donation.status,
        'DISPUTED',
        'Only rejected donations can be disputed.'
      );
    }

    const nextVersion = donation.statusVersion + 1;
    const updated: EnhancedDonation = {
      ...donation,
      status: 'DISPUTED',
      statusVersion: nextVersion,
      disputedAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.donations.set(donationId, updated);
    this.audits.push({
      donationId,
      reference: donation.reference,
      fromStatus: 'REJECTED',
      toStatus: 'DISPUTED',
      actorUid,
      actorType: 'DONOR',
      timestamp: Date.now(),
    });

    return updated;
  }

  getAudits(): Step2BDonationAuditEntry[] {
    return [...this.audits];
  }

  clear(): void {
    this.proofs.clear();
    this.utrs.clear();
    this.hashes.clear();
    this.donations.clear();
    this.audits = [];
  }
}
