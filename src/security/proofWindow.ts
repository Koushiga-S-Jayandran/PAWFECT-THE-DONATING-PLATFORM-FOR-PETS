/**
 * Proof Submission Window & Eligibility Rules
 * Decides whether a donor may submit payment proof for a given donation.
 */

import type { EnhancedDonation } from '../domain/proofEntities.js';

export const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours after expiry
export const MAX_REJECTIONS = 3;

export interface ProofWindowCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly remainingGraceMs?: number;
  readonly attemptNumber: number; // 1, 2, or 3
}

export function evaluateProofWindow(
  donation: EnhancedDonation,
  actorUid: string,
  now: number = Date.now()
): ProofWindowCheckResult {
  // Authorization: Only the donor may submit proof
  if (actorUid !== donation.donorUid) {
    return {
      allowed: false,
      reason: 'Only the original donor can submit payment proof.',
      attemptNumber: 0,
    };
  }

  const rejectionCount = donation.rejectionCount || 0;
  const attemptNumber = rejectionCount + 1;

  if (attemptNumber > MAX_REJECTIONS) {
    return {
      allowed: false,
      reason: 'Maximum proof attempts (3) have been reached for this donation.',
      attemptNumber,
    };
  }

  const expiresAt =
    typeof donation.expiresAt === 'number'
      ? donation.expiresAt
      : new Date(donation.expiresAt).getTime();

  const status = donation.status;

  // Case 1: Fresh pending / awaiting payment
  if (status === 'PENDING' || status === 'AWAITING_PAYMENT') {
    if (now <= expiresAt) {
      return {
        allowed: true,
        attemptNumber,
      };
    }
    // If past expiresAt but within 24h grace period
    const graceExpiry = expiresAt + GRACE_PERIOD_MS;
    if (now <= graceExpiry) {
      return {
        allowed: true,
        remainingGraceMs: graceExpiry - now,
        attemptNumber,
      };
    }
    return {
      allowed: false,
      reason: 'The 24-hour post-expiry proof window has closed.',
      attemptNumber,
    };
  }

  // Case 2: EXPIRED status within 24 hours
  if (status === 'EXPIRED') {
    const graceExpiry = expiresAt + GRACE_PERIOD_MS;
    if (now <= graceExpiry) {
      return {
        allowed: true,
        remainingGraceMs: graceExpiry - now,
        attemptNumber,
      };
    }
    return {
      allowed: false,
      reason: 'The 24-hour post-expiry proof window has closed.',
      attemptNumber,
    };
  }

  // Case 3: REJECTED status with remaining attempts
  if (status === 'REJECTED') {
    if (rejectionCount < MAX_REJECTIONS) {
      return {
        allowed: true,
        attemptNumber,
      };
    }
    return {
      allowed: false,
      reason: 'This donation has reached the maximum of 3 rejections.',
      attemptNumber,
    };
  }

  // Any other status: PROOF_SUBMITTED, CONFIRMED, DISPUTED, CANCELLED
  if (status === 'PROOF_SUBMITTED') {
    return {
      allowed: false,
      reason: 'Proof has already been submitted and is awaiting shelter confirmation.',
      attemptNumber,
    };
  }

  if (status === 'CONFIRMED') {
    return {
      allowed: false,
      reason: 'This donation has already been confirmed by the shelter.',
      attemptNumber,
    };
  }

  if (status === 'DISPUTED') {
    return {
      allowed: false,
      reason: 'This donation is currently under dispute review.',
      attemptNumber,
    };
  }

  if (status === 'CANCELLED') {
    return {
      allowed: false,
      reason: 'This donation was cancelled.',
      attemptNumber,
    };
  }

  return {
    allowed: false,
    reason: 'Proof submission is not permitted in the current state.',
    attemptNumber,
  };
}
