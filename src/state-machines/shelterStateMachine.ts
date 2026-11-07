/**
 * Shelter State Machine
 * The single source of truth for legal status transitions, actor permissions,
 * required reasons, and resubmission bounds.
 */

import type { ShelterStatus, AuditActorType } from '../domain/shelterEntities.js';
import {
  IllegalTransitionError,
  NotAuthorizedError,
  ValidationError,
  StaleVersionError,
} from '../domain/shelterErrors.js';

export interface TransitionRule {
  readonly from: ShelterStatus;
  readonly to: ShelterStatus;
  readonly actor: AuditActorType;
  readonly reasonRequired: boolean;
  readonly setsVerified: boolean | null; // true, false, or null if unchanged
}

export const TRANSITION_REGISTRY: readonly TransitionRule[] = [
  // Admin transitions
  {
    from: 'PENDING',
    to: 'APPROVED',
    actor: 'ADMIN',
    reasonRequired: false,
    setsVerified: true,
  },
  {
    from: 'PENDING',
    to: 'REJECTED',
    actor: 'ADMIN',
    reasonRequired: true,
    setsVerified: false,
  },
  {
    from: 'APPROVED',
    to: 'SUSPENDED',
    actor: 'ADMIN',
    reasonRequired: true,
    setsVerified: false,
  },
  {
    from: 'APPROVED',
    to: 'REMOVED',
    actor: 'ADMIN',
    reasonRequired: true,
    setsVerified: false,
  },
  {
    from: 'SUSPENDED',
    to: 'APPROVED',
    actor: 'ADMIN',
    reasonRequired: false,
    setsVerified: true,
  },
  {
    from: 'SUSPENDED',
    to: 'REMOVED',
    actor: 'ADMIN',
    reasonRequired: true,
    setsVerified: false,
  },
  {
    from: 'REJECTED',
    to: 'REMOVED',
    actor: 'ADMIN',
    reasonRequired: true,
    setsVerified: false,
  },
  // Owner transition: Fix and resubmit
  {
    from: 'REJECTED',
    to: 'PENDING',
    actor: 'OWNER',
    reasonRequired: false,
    setsVerified: false,
  },
] as const;

export const MAX_RESUBMISSIONS = 3;

export function findTransitionRule(
  from: ShelterStatus,
  to: ShelterStatus,
  actor: AuditActorType
): TransitionRule | undefined {
  return TRANSITION_REGISTRY.find(
    (t) => t.from === from && t.to === to && t.actor === actor
  );
}

export function validateStatusTransition(params: {
  fromStatus: ShelterStatus;
  toStatus: ShelterStatus;
  actorType: AuditActorType;
  actorId: string;
  shelterOwnerId: string;
  currentResubmitCount: number;
  reason?: string;
}): TransitionRule {
  const {
    fromStatus,
    toStatus,
    actorType,
    actorId,
    shelterOwnerId,
    currentResubmitCount,
    reason,
  } = params;

  // 1. Guard against self-approval by Admin
  if (actorType === 'ADMIN' && actorId === shelterOwnerId) {
    throw new NotAuthorizedError(
      'Admins cannot moderate or approve their own registered shelter.'
    );
  }

  // 2. Check transition validity in the registry
  const rule = findTransitionRule(fromStatus, toStatus, actorType);
  if (!rule) {
    throw new IllegalTransitionError(
      fromStatus,
      toStatus,
      `Action not permitted for actor role '${actorType}'.`
    );
  }

  // 3. Reason requirement check
  if (rule.reasonRequired) {
    const trimmedReason = (reason || '').trim();
    if (trimmedReason.length < 10 || trimmedReason.length > 300) {
      throw new ValidationError(
        `A moderation reason between 10 and 300 characters is required to transition to '${toStatus}'.`
      );
    }
  }

  // 4. Owner resubmission count check
  if (actorType === 'OWNER' && fromStatus === 'REJECTED' && toStatus === 'PENDING') {
    if (currentResubmitCount >= MAX_RESUBMISSIONS) {
      throw new IllegalTransitionError(
        fromStatus,
        toStatus,
        `Maximum resubmission limit (${MAX_RESUBMISSIONS}) reached. Please contact support.`
      );
    }
  }

  return rule;
}

export function getAvailableAdminActions(currentStatus: ShelterStatus): ShelterStatus[] {
  return TRANSITION_REGISTRY.filter(
    (t) => t.from === currentStatus && t.actor === 'ADMIN'
  ).map((t) => t.to);
}

export function assertCanModerate(adminUid: string, shelterOwnerId: string): void {
  if (adminUid === shelterOwnerId) {
    throw new NotAuthorizedError(
      'Admins cannot moderate or approve their own registered shelter.'
    );
  }
}

export function assertVersionMatch(currentVersion: number, expectedVersion: number): void {
  if (currentVersion !== expectedVersion) {
    throw new StaleVersionError(expectedVersion, currentVersion);
  }
}

export function canTransition(
  from: ShelterStatus,
  to: ShelterStatus,
  actor: AuditActorType = 'ADMIN'
): boolean {
  return TRANSITION_REGISTRY.some(
    (t) => t.from === from && t.to === to && t.actor === actor
  );
}

export function isReasonRequired(status: ShelterStatus): boolean {
  return status === 'REJECTED' || status === 'SUSPENDED' || status === 'REMOVED';
}

export function assertLegalTransition(
  from: ShelterStatus,
  to: ShelterStatus,
  options?: {
    actor?: AuditActorType;
    actorId?: string;
    shelterOwnerId?: string;
    currentResubmitCount?: number;
    reason?: string;
  }
): TransitionRule {
  const actor = options?.actor ?? 'ADMIN';
  const actorId = options?.actorId ?? 'admin_test';
  const shelterOwnerId = options?.shelterOwnerId ?? 'shelter_test';
  const currentResubmitCount = options?.currentResubmitCount ?? 0;
  const reason = options?.reason;

  return validateStatusTransition({
    fromStatus: from,
    toStatus: to,
    actorType: actor,
    actorId,
    shelterOwnerId,
    currentResubmitCount,
    reason,
  });
}
