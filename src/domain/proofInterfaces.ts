/**
 * Repository and Service Interfaces for Proof Submission & Confirmation
 */

import type {
  DonationProof,
  EnhancedDonation,
  ProofFlags,
  Step2BDonationAuditEntry,
  Step2BDonationStatus,
} from './proofEntities.js';

export interface ImageUploader {
  uploadProofImage(blob: Blob, hash: string): Promise<string>;
}

export interface UtrRegistry {
  isUtrUsed(utr: string): Promise<boolean>;
}

export interface HashRegistry {
  isHashPresent(hash: string): Promise<boolean>;
}

export interface SubmitProofBatchParams {
  readonly donation: EnhancedDonation;
  readonly proof: DonationProof;
  readonly newStatusVersion: number;
  readonly isNewHash: boolean;
  readonly audit: Step2BDonationAuditEntry;
}

export interface ProofWriter {
  submitProofAtomic(params: SubmitProofBatchParams): Promise<void>;
}

export interface ProofReader {
  getProofById(id: string): Promise<DonationProof | null>;
  getProofsForDonation(donationId: string): Promise<DonationProof[]>;
  getLatestProofForDonation(donationId: string): Promise<DonationProof | null>;
}

export interface ShelterPaymentDecisionParams {
  readonly donationId: string;
  readonly shelterId: string;
  readonly expectedVersion: number;
  readonly decision: 'CONFIRM' | 'REJECT';
  readonly reason?: string;
  readonly actorUid: string;
}

export interface ShelterPaymentReviewResult {
  readonly donation: EnhancedDonation;
  readonly newStatus: Step2BDonationStatus;
  readonly audit: Step2BDonationAuditEntry;
}

export interface Clock {
  now(): number;
}
