/**
 * Shelter Domain Entities
 * Strict types representing public shelter data, private verified contact/payment details,
 * and immutable audit log entries.
 */

import type { AnimalTypeId } from '../config/animalTypes.js';
import type { UrgencyLevelId } from '../config/urgencyLevels.js';

export type ShelterStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REMOVED';

export interface Shelter {
  readonly ownerId: string;
  readonly name: string;
  readonly stateCode: string;
  readonly district: string;
  readonly area: string;
  readonly animalTypes: readonly AnimalTypeId[];
  readonly description: string;
  readonly urgency: UrgencyLevelId;
  readonly urgencyNote: string;
  readonly verified: boolean;
  readonly status: ShelterStatus;
  readonly statusVersion: number;
  readonly resubmitCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approvedAt: string | null;
}

export interface ShelterPrivate {
  readonly contactPerson: string;
  readonly phone: string;
  readonly fullAddress: string;
  readonly upiId: string;
  readonly upiHolderName: string;
  readonly registrationNumber: string;
  readonly supportLink: string;
  readonly statusReason: string;
  readonly consentAt: string;
}

export type AuditActorType = 'OWNER' | 'ADMIN';

export interface AuditLogEntry {
  readonly shelterId: string;
  readonly actorId: string;
  readonly actorType: AuditActorType;
  readonly action: string;
  readonly fromStatus: ShelterStatus | null;
  readonly toStatus: ShelterStatus;
  readonly reason: string;
  readonly createdAt: string;
}

export interface AdminRecord {
  readonly uid: string;
  readonly role: string;
}
