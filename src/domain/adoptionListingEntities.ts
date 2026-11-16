/**
 * Domain Entities for "List an Animal for Adoption"
 */

import type {
  ListingStatus,
  ListingSpecies,
  ListingGender,
  ListingSize,
  TriStateCompatibility,
  ListerType,
  AdoptionInterestStatus,
  ListingReportStatus,
  ListingHousingType,
} from '../config/adoptionListingConfig.js';

export interface AdoptionListing {
  id: string;
  listerUid: string;
  listerType: ListerType;
  shelterId?: string;
  shelterName?: string;
  verifiedShelter: boolean;

  // Step A: Animal
  name: string;
  isUnnamed: boolean;
  species: ListingSpecies;
  breed: string;
  ageMonths: number;
  gender: ListingGender;
  size: ListingSize;
  color: string;

  // Step B: Health & Nature
  vaccinated: boolean;
  sterilised: boolean;
  injuriesOrConditions: string;
  temperament: string[];
  goodWithKids: TriStateCompatibility;
  goodWithOtherPets: TriStateCompatibility;

  // Step C: Photos
  photos: string[];

  // Step D: Story
  story: string;

  // Step E: Location (TN/KL only via regions.ts)
  stateCode: string;
  stateName: string;
  district: string;
  city: string;

  // Step F: Non-sensitive contact preferences (phone stored ONLY in private subdoc)
  contactName: string;
  revealOnlyToApproved: boolean;
  phoneVerified: boolean;

  // Lifecycle & Moderation
  status: ListingStatus;
  wasPreviouslyApproved?: boolean;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  duplicateFingerprint: string;

  // Activity & Auto-hide tracking
  lastActivityAt: string;
  expiresAt: string;
  inactivityReminderSentAt?: string;
  adoptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListingPrivateContact {
  listingId: string;
  listerUid: string;
  contactName: string;
  phone: string;
  revealOnlyToApproved: boolean;
  otpVerifiedAt: string;
  updatedAt: string;
}

export interface AdoptionInterestRequest {
  id: string; // Deterministic: `${adopterId}_${listingId}`
  petId: string; // Keeps compatibility with existing adoptionRequests schema
  listingId: string;
  petName: string;
  shelterId: string; // Lister UID (individual or shelter) for unified rules
  listerUid: string;
  adopterId: string;
  adopterName: string;
  adopterEmail: string;
  adopterPhone?: string;
  reason: string;
  housingType: ListingHousingType;
  experience: string;
  ownsHome?: boolean;
  landlordPermission?: boolean;
  hasYard?: boolean;
  hasOtherPets?: boolean;
  otherPetsDetail?: string;
  status: AdoptionInterestStatus;
  statusReason?: string;
  statusUpdatedAt: string;
  createdAt: string;
}

export interface ListingReport {
  id: string; // Deterministic: `${reporterUid}_${listingId}`
  listingId: string;
  listingName: string;
  listerUid: string;
  reporterUid: string;
  reason: 'suspected_sale' | 'fraud_or_upfront_fee' | 'animal_cruelty' | 'misleading_info' | 'other';
  details: string;
  status: ListingReportStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ListingAuditLog {
  id: string;
  listingId: string;
  actorUid: string;
  actorRole: 'lister' | 'admin' | 'adopter' | 'system';
  action: string;
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  createdAt: string;
}

export interface ListingFilterCriteria {
  species?: ListingSpecies;
  stateCode?: string;
  district?: string;
  ageRange?: 'puppy_kitten' | 'young' | 'adult' | 'senior';
  gender?: ListingGender;
  size?: ListingSize;
  vaccinated?: boolean;
  searchQuery?: string;
  sortBy?: 'newest' | 'youngest' | 'oldest';
  includeAdopted?: boolean;
}

export interface ListingFormDraft {
  step: number;
  listerType: ListerType;
  name: string;
  isUnnamed: boolean;
  species: ListingSpecies;
  breed: string;
  ageValue: number;
  ageUnit: 'months' | 'years';
  gender: ListingGender;
  size: ListingSize;
  color: string;
  vaccinated: boolean;
  sterilised: boolean;
  injuriesOrConditions: string;
  temperament: string[];
  goodWithKids: TriStateCompatibility;
  goodWithOtherPets: TriStateCompatibility;
  photos: string[];
  story: string;
  stateCode: string;
  district: string;
  city: string;
  contactName: string;
  phone: string;
  revealOnlyToApproved: boolean;
  phoneVerifiedForNumber: string;
}
