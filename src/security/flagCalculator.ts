/**
 * Flag Calculator for Donation Proofs
 * Identifies potential anomalies (mismatched amount, duplicate screenshot, overdue review).
 * Flags warn the shelter and NEVER auto-reject.
 */

import type { ProofFlags } from '../domain/proofEntities.js';

export const OVERDUE_HOURS_MS = 48 * 60 * 60 * 1000; // 48 hours

export function calculateProofFlags(params: {
  readonly paidAmountPaise: number;
  readonly expectedAmountPaise: number;
  readonly hashAlreadyExisted: boolean;
  readonly proofSubmittedAt?: number | null;
  readonly now?: number;
}): ProofFlags {
  const {
    paidAmountPaise,
    expectedAmountPaise,
    hashAlreadyExisted,
    proofSubmittedAt,
    now = Date.now(),
  } = params;

  const amountMismatch = paidAmountPaise !== expectedAmountPaise;
  const duplicateImage = hashAlreadyExisted;
  const overdue = Boolean(
    proofSubmittedAt && now - proofSubmittedAt >= OVERDUE_HOURS_MS
  );

  return {
    amountMismatch,
    duplicateImage,
    overdue,
  };
}
