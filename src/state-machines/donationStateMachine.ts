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

export interface DonationTransitionRule {
  readonly from: DonationStatus;
  readonly to: DonationStatus;
  readonly actor: DonationActorType;
  readonly enabledInStep1: boolean;
  readonly reasonRequired: boolean;
}

export const DONATION_TRANSITIONS: readonly DonationTransitionRule[] = [
  // 1. Donor cancels pending donation
  {
    from: 'PENDING',
    to: 'CANCELLED',
    actor: 'DONOR',
    enabledInStep1: true,
    reasonRequired: false,
  },
  // 2. System or client expires pending donation past TTL
  {
    from: 'PENDING',
    to: 'EXPIRED',
    actor: 'SYSTEM',
    enabledInStep1: true,
    reasonRequired: false,
  },
  {
    from: 'PENDING',
    to: 'EXPIRED',
    actor: 'DONOR',
    enabledInStep1: true,
    reasonRequired: false,
  },
  // 3. Reserved for Part B: Payment settlement confirmation
  {
    from: 'PENDING',
    to: 'CONFIRMED',
    actor: 'SYSTEM',
    enabledInStep1: false, // Locked until Part B
    reasonRequired: false,
  },
  {
    from: 'PENDING',
    to: 'CONFIRMED',
    actor: 'ADMIN',
    enabledInStep1: false, // Locked until Part B
    reasonRequired: true,
  },
  // 4. Reserved for Part B: Refund
  {
    from: 'CONFIRMED',
    to: 'REFUNDED',
    actor: 'ADMIN',
    enabledInStep1: false, // Locked until Part B
    reasonRequired: true,
  },
] as const;

export function findDonationTransition(
  from: DonationStatus,
  to: DonationStatus,
  actor: DonationActorType
): DonationTransitionRule | undefined {
  return DONATION_TRANSITIONS.find(
    (rule) => rule.from === from && rule.to === to && rule.actor === actor
  );
}

export function canTransitionDonation(
  from: DonationStatus,
  to: DonationStatus,
  actor: DonationActorType = 'DONOR'
): boolean {
  const rule = findDonationTransition(from, to, actor);
  return Boolean(rule && rule.enabledInStep1);
}

export function assertLegalDonationTransition(params: {
  fromStatus: DonationStatus;
  toStatus: DonationStatus;
  actorType: DonationActorType;
  actorUid: string;
  donorUid: string;
  reason?: string;
}): DonationTransitionRule {
  const { fromStatus, toStatus, actorType, actorUid, donorUid, reason } = params;

  // Authorization check for donors
  if (actorType === 'DONOR' && actorUid !== donorUid) {
    throw new DonationStateError(
      fromStatus,
      toStatus,
      'You can only modify your own donation.'
    );
  }

  const rule = findDonationTransition(fromStatus, toStatus, actorType);
  if (!rule) {
    throw new DonationStateError(
      fromStatus,
      toStatus,
      `Action not permitted for actor role '${actorType}'.`
    );
  }

  if (!rule.enabledInStep1) {
    throw new DonationStateError(
      fromStatus,
      toStatus,
      `Transition to '${toStatus}' is reserved for Part B payment verification.`
    );
  }

  if (rule.reasonRequired && (!reason || reason.trim().length < 5)) {
    throw new DonationStateError(
      fromStatus,
      toStatus,
      'A valid reason is required for this action.'
    );
  }

  return rule;
}
