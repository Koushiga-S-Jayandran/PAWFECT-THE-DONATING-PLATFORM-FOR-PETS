/**
 * Adoption Listing Configuration Constants
 * Single source of truth for statuses, limits, species, and moderation thresholds.
 */

export const LISTING_STATUS = {
  PENDING: 'pending',
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ON_HOLD: 'on_hold',
  ADOPTED: 'adopted',
  EXPIRED_HIDDEN: 'expired_hidden',
} as const;

export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type AdoptionInterestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const REPORT_STATUS = {
  OPEN: 'open',
  RESOLVED_DISMISSED: 'resolved_dismissed',
  RESOLVED_REMOVED: 'resolved_removed',
} as const;

export type ListingReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const LISTING_SPECIES = ['dog', 'cat', 'other'] as const;
export type ListingSpecies = (typeof LISTING_SPECIES)[number];

export const LISTING_GENDERS = ['male', 'female', 'unknown'] as const;
export type ListingGender = (typeof LISTING_GENDERS)[number];

export const LISTING_SIZES = ['small', 'medium', 'large'] as const;
export type ListingSize = (typeof LISTING_SIZES)[number];

export const TRI_STATE_FLAGS = ['yes', 'no', 'unknown'] as const;
export type TriStateCompatibility = (typeof TRI_STATE_FLAGS)[number];

export const LISTER_TYPES = ['individual', 'shelter'] as const;
export type ListerType = (typeof LISTER_TYPES)[number];

export const HOUSING_TYPES = [
  'own_apartment',
  'rent_apartment',
  'own_house',
  'rent_house',
] as const;
export type ListingHousingType = (typeof HOUSING_TYPES)[number];

export const LISTING_LIMITS = {
  MAX_PHOTOS: 5,
  MIN_PHOTOS: 1,
  STORY_MIN_LENGTH: 30,
  STORY_MAX_LENGTH: 1000,
  REASON_MIN_LENGTH: 10,
  REASON_MAX_LENGTH: 300,
  MAX_LISTINGS_PER_DAY: 3,
  REMINDER_AFTER_DAYS: 50,
  INACTIVITY_AUTO_HIDE_DAYS: 60,
  MAX_TEMPERAMENT_TAGS: 8,
} as const;

export const ADOPTION_PHOTOS_FOLDER = 'pawfect/adoptions';
export const LISTING_DRAFT_STORAGE_PREFIX = 'pawfect_animal_listing_draft_v1_';

export const TEMPERAMENT_SUGGESTIONS = [
  'Friendly',
  'Calm',
  'Playful',
  'Gentle',
  'Shy at first',
  'House-trained',
  'Leash-trained',
  'Affectionate',
  'Active',
  'Good watchdog',
] as const;

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  pending: 'Pending Admin Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved & Live',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  adopted: 'Adopted (Happy Tail)',
  expired_hidden: 'Hidden (60-Day Inactivity)',
};
