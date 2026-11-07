/**
 * Donation State Machine
 *
 * Single source of truth for legal status changes.
 * In this step (Part A), only CANCELLED and EXPIRED transitions are enabled.
 * Payment verification (CONFIRMED) and reversals (REFUNDED) are declared
 * in the registry but disabled/blocked until Part B.
 */

import type { DonationStatus } from '../config/donationConfig.js';
import type { DonationActorType } from '../domain/donationEntities.js';
import { DonationStateError } from '../domain/donationErrors.js';
import { IllegalTransitionError } from '../domain/proofErrors.js';

export type ExtendedDonationActorType = DonationActorType | 'SHELTER';

export interface DonationTransitionRule {
  readonly from: DonationStatus | string;
  readonly to: DonationStatus | string;
  readonly actor: ExtendedDonationActorType;
  readonly enabled: boolean;
  readonly reasonRequired: boolean;
}

export const DONATION_TRANSITIONS: readonly DonationTransitionRule[] = [
  // 1. Part A: Donor cancels pending/awaiting payment
  {
    from: 'PENDING',
    to: 'CANCELLED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  {
    from: 'AWAITING_PAYMENT',
    to: 'CANCELLED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  // 2. Part A: System or donor expires pending/awaiting payment past TTL
  {
    from: 'PENDING',
    to: 'EXPIRED',
    actor: 'SYSTEM',
    enabled: true,
    reasonRequired: false,
  },
  {
    from: 'PENDING',
    to: 'EXPIRED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  {
    from: 'AWAITING_PAYMENT',
    to: 'EXPIRED',
    actor: 'SYSTEM',
    enabled: true,
    reasonRequired: false,
  },
  {
    from: 'AWAITING_PAYMENT',
    to: 'EXPIRED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  // 3. Step 2B: Donor submits proof before expiry
  {
    from: 'PENDING',
    to: 'PROOF_SUBMITTED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  {
    from: 'AWAITING_PAYMENT',
    to: 'PROOF_SUBMITTED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  // 4. Step 2B: Donor submits proof up to 24h after expiry
  {
    from: 'EXPIRED',
    to: 'PROOF_SUBMITTED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  // 5. Step 2B: Donor re-submits proof while rejection count < 3
  {
    from: 'REJECTED',
    to: 'PROOF_SUBMITTED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  // 6. Step 2B: Shelter confirms proof
  {
    from: 'PROOF_SUBMITTED',
    to: 'CONFIRMED',
    actor: 'SHELTER',
    enabled: true,
    reasonRequired: false,
  },
  // 7. Step 2B: Shelter rejects proof (reason required)
  {
    from: 'PROOF_SUBMITTED',
    to: 'REJECTED',
    actor: 'SHELTER',
    enabled: true,
    reasonRequired: true,
  },
  // 8. Step 2B: Donor opens dispute on rejected donation
  {
    from: 'REJECTED',
    to: 'DISPUTED',
    actor: 'DONOR',
    enabled: true,
    reasonRequired: false,
  },
  // 9. Reserved/Disabled: Reversals or non-allowed transitions
  {
    from: 'CONFIRMED',
    to: 'REFUNDED',
    actor: 'ADMIN',
    enabled: false,
    reasonRequired: true,
  },
] as const;

export function findDonationTransition(
  from: DonationStatus | string,
  to: DonationStatus | string,
  actor: ExtendedDonationActorType
): DonationTransitionRule | undefined {
  return DONATION_TRANSITIONS.find(
    (rule) => rule.from === from && rule.to === to && rule.actor === actor
  );
}

export function canTransitionDonation(
  from: DonationStatus | string,
  to: DonationStatus | string,
  actor: ExtendedDonationActorType = 'DONOR'
): boolean {
  const rule = findDonationTransition(from, to, actor);
  return Boolean(rule && rule.enabled);
}

export function assertLegalDonationTransition(params: {
  fromStatus: DonationStatus | string;
  toStatus: DonationStatus | string;
  actorType: ExtendedDonationActorType;
  actorUid: string;
  donorUid: string;
  shelterId?: string;
  reason?: string;
}): DonationTransitionRule {
  const { fromStatus, toStatus, actorType, actorUid, donorUid, shelterId, reason } = params;

  // Authorization check for donors
  if (actorType === 'DONOR' && actorUid !== donorUid) {
    throw new DonationStateError(
      fromStatus as DonationStatus,
      toStatus as DonationStatus,
      'You can only modify your own donation.'
    );
  }

  // Authorization check for shelters
  if (actorType === 'SHELTER') {
    if (shelterId && actorUid !== shelterId) {
      throw new DonationStateError(
        fromStatus as DonationStatus,
        toStatus as DonationStatus,
        'You can only confirm or reject donations made to your own shelter.'
      );
    }
    // Prevent shelter owner from confirming own donation if they happen to be donor
    if (donorUid === actorUid) {
      throw new DonationStateError(
        fromStatus as DonationStatus,
        toStatus as DonationStatus,
        'Shelter owners cannot confirm their own donations.'
      );
    }
  }

  const rule = findDonationTransition(fromStatus, toStatus, actorType);
  if (!rule) {
    throw new IllegalTransitionError(
      fromStatus,
      toStatus,
      `Action not permitted for actor role '${actorType}'.`
    );
  }

  if (!rule.enabled) {
    throw new IllegalTransitionError(
      fromStatus,
      toStatus,
      `Transition to '${toStatus}' is currently disabled.`
    );
  }

  if (rule.reasonRequired && (!reason || reason.trim().length < 10)) {
    throw new DonationStateError(
      fromStatus as DonationStatus,
      toStatus as DonationStatus,
      'A valid reason (at least 10 characters) is required for this action.'
    );
  }

  return rule;
}
