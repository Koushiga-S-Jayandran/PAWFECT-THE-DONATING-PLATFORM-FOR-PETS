/**
 * Pure Domain State Machine & Inactivity Rules for Adoption Listings
 * Completely decoupled from Firebase SDK for reliable unit testing.
 */

import {
  LISTING_LIMITS,
  LISTING_STATUS,
  type ListingStatus,
  type AdoptionInterestStatus,
} from '../config/adoptionListingConfig.js';
import type { AdoptionListing } from '../domain/adoptionListingEntities.js';

export type AdminModerationDecision = 'approved' | 'rejected' | 'changes_requested';

export function canAdminModerateListing(params: {
  isAdmin: boolean;
  adminUid: string;
  listerUid: string;
  fromStatus: ListingStatus;
  decision: AdminModerationDecision;
  reason?: string;
}): { allowed: boolean; error?: string } {
  if (!params.isAdmin) {
    return { allowed: false, error: 'Admin privileges required.' };
  }
  if (params.adminUid === params.listerUid) {
    return { allowed: false, error: 'Admins cannot moderate their own listings.' };
  }

  const allowedSourceStatuses: readonly ListingStatus[] = [
    LISTING_STATUS.PENDING,
    LISTING_STATUS.CHANGES_REQUESTED,
    LISTING_STATUS.APPROVED,
    LISTING_STATUS.ON_HOLD,
  ];
  if (!allowedSourceStatuses.includes(params.fromStatus)) {
    return {
      allowed: false,
      error: `Cannot moderate a listing in "${params.fromStatus}" status.`,
    };
  }

  if (params.decision !== LISTING_STATUS.APPROVED) {
    const trimmed = (params.reason || '').trim();
    if (
      trimmed.length < LISTING_LIMITS.REASON_MIN_LENGTH ||
      trimmed.length > LISTING_LIMITS.REASON_MAX_LENGTH
    ) {
      return {
        allowed: false,
        error: `A moderation reason (${LISTING_LIMITS.REASON_MIN_LENGTH}-${LISTING_LIMITS.REASON_MAX_LENGTH} characters) is required.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Editing an approved listing ALWAYS resets status back to pending for admin re-approval.
 */
export function resolveStatusAfterListerEdit(currentStatus: ListingStatus): ListingStatus {
  if (
    currentStatus === LISTING_STATUS.APPROVED ||
    currentStatus === LISTING_STATUS.CHANGES_REQUESTED ||
    currentStatus === LISTING_STATUS.REJECTED ||
    currentStatus === LISTING_STATUS.EXPIRED_HIDDEN
  ) {
    return LISTING_STATUS.PENDING;
  }
  return currentStatus;
}

export function canListerChangeStatus(params: {
  fromStatus: ListingStatus;
  toStatus: ListingStatus;
}): { allowed: boolean; error?: string } {
  const { fromStatus, toStatus } = params;

  if (toStatus === LISTING_STATUS.ADOPTED) {
    if (
      fromStatus === LISTING_STATUS.APPROVED ||
      fromStatus === LISTING_STATUS.ON_HOLD
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      error: 'Only approved or on-hold listings can be marked as Adopted.',
    };
  }

  if (toStatus === LISTING_STATUS.ON_HOLD) {
    if (fromStatus === LISTING_STATUS.APPROVED) {
      return { allowed: true };
    }
    return { allowed: false, error: 'Only live approved listings can be put On Hold.' };
  }

  if (toStatus === LISTING_STATUS.APPROVED) {
    if (fromStatus === LISTING_STATUS.ON_HOLD) {
      return { allowed: true };
    }
    return {
      allowed: false,
      error: 'Only listings currently On Hold can resume directly without re-approval.',
    };
  }

  return {
    allowed: false,
    error: `Lister transition from "${fromStatus}" to "${toStatus}" is not permitted.`,
  };
}

export interface InactivityEvaluation {
  needsReminder: boolean;
  shouldAutoHide: boolean;
  daysInactive: number;
  daysUntilAutoHide: number;
}

export function evaluateListingInactivity(
  listing: Pick<AdoptionListing, 'status' | 'lastActivityAt' | 'inactivityReminderSentAt'>,
  nowMs: number = Date.now()
): InactivityEvaluation {
  const lastMs = new Date(listing.lastActivityAt).getTime();
  if (!Number.isFinite(lastMs)) {
    return {
      needsReminder: false,
      shouldAutoHide: false,
      daysInactive: 0,
      daysUntilAutoHide: LISTING_LIMITS.INACTIVITY_AUTO_HIDE_DAYS,
    };
  }

  const diffDays = Math.floor((nowMs - lastMs) / (1000 * 60 * 60 * 24));
  const daysUntilAutoHide = Math.max(0, LISTING_LIMITS.INACTIVITY_AUTO_HIDE_DAYS - diffDays);

  if (listing.status !== LISTING_STATUS.APPROVED && listing.status !== LISTING_STATUS.ON_HOLD) {
    return {
      needsReminder: false,
      shouldAutoHide: false,
      daysInactive: diffDays,
      daysUntilAutoHide,
    };
  }

  const shouldAutoHide = diffDays >= LISTING_LIMITS.INACTIVITY_AUTO_HIDE_DAYS;
  const needsReminder =
    !shouldAutoHide &&
    diffDays >= LISTING_LIMITS.REMINDER_AFTER_DAYS &&
    !listing.inactivityReminderSentAt;

  return {
    needsReminder,
    shouldAutoHide,
    daysInactive: diffDays,
    daysUntilAutoHide,
  };
}

/**
 * Contact Phone Reveal Policy:
 * Phone number is NEVER exposed publicly.
 * It is revealed ONLY to the lister (owner), an admin, or an adopter whose request status === 'approved'.
 */
export function canRevealListerPhone(params: {
  viewerUid: string | null | undefined;
  listerUid: string;
  isAdmin?: boolean;
  adopterRequestStatus?: AdoptionInterestStatus | null;
}): boolean {
  if (!params.viewerUid) return false;
  if (params.viewerUid === params.listerUid) return true;
  if (params.isAdmin) return true;
  return params.adopterRequestStatus === 'approved';
}

export function getTodayUtcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function checkDailyRateLimit(params: {
  storedDateKey?: string;
  storedCount?: number;
  todayDateKey: string;
  maxPerDay?: number;
}): { allowed: boolean; nextCount: number; remaining: number } {
  const max = params.maxPerDay ?? LISTING_LIMITS.MAX_LISTINGS_PER_DAY;
  const currentCount = params.storedDateKey === params.todayDateKey ? params.storedCount || 0 : 0;

  if (currentCount >= max) {
    return { allowed: false, nextCount: currentCount, remaining: 0 };
  }
  return {
    allowed: true,
    nextCount: currentCount + 1,
    remaining: Math.max(0, max - (currentCount + 1)),
  };
}

export function computeExpiryIso(fromMs: number = Date.now()): string {
  return new Date(
    fromMs + LISTING_LIMITS.INACTIVITY_AUTO_HIDE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}
