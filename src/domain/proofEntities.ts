/**
 * Domain Entities for Payment Proof and Shelter Confirmation (Step 2B)
 */

import type { Donation } from './donationEntities.js';

export type Step2BDonationStatus =
  | 'AWAITING_PAYMENT'
  | 'PENDING'
  | 'PROOF_SUBMITTED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type Step2BActorType = 'DONOR' | 'SHELTER' | 'ADMIN' | 'SYSTEM';

export interface ProofFlags {
  readonly duplicateImage: boolean;
  readonly amountMismatch: boolean;
  readonly overdue?: boolean; // Over 48 hours in PROOF_SUBMITTED
}

export interface DonationProof {
  readonly id: string; // ${donationId}_a${attempt}
  readonly donationId: string;
  readonly donorId: string;
  readonly shelterId: string;
  readonly attempt: number; // 1, 2, or 3
  readonly imageUrl: string;
  readonly utr: string; // 12-digit numeric
  readonly paidAmountPaise: number; // Integer paise
  readonly imageHash: string; // SHA-256 64-hex
  readonly flags: ProofFlags;
  readonly createdAt: number;
}

export interface UtrGuard {
  readonly utr: string;
  readonly donationId: string;
  readonly donorId: string;
  readonly createdAt: number;
}

export interface ProofHashRecord {
  readonly hash: string;
  readonly donationId: string;
  readonly createdAt: number;
}

export interface ProofSubmissionInput {
  readonly donationId: string;
  readonly utr: string;
  readonly paidAmountPaise: number;
  readonly file: File;
}

export interface Step2BDonationAuditEntry {
  readonly id?: string;
  readonly donationId: string;
  readonly reference: string;
  readonly fromStatus: Step2BDonationStatus;
  readonly toStatus: Step2BDonationStatus;
  readonly actorUid: string;
  readonly actorType: Step2BActorType;
  readonly reason?: string;
  readonly timestamp: number;
}

export interface EnhancedDonation extends Omit<Donation, 'status'> {
  readonly status: Step2BDonationStatus;
  readonly proofSubmittedAt?: number | null;
  readonly latestProofAttempt?: number; // 0-3
  readonly rejectionCount?: number; // 0-3
  readonly confirmedAt?: number | null;
  readonly rejectionReason?: string | null;
  readonly disputedAt?: number | null;
}
