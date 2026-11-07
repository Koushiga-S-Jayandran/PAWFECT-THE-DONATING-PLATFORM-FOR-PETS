/**
 * Small, focused domain interfaces for Shelter Operations
 */

import type {
  Shelter,
  ShelterPrivate,
  ShelterStatus,
  AuditLogEntry,
} from './shelterEntities.js';
import type { UrgencyLevelId } from '../config/urgencyLevels.js';

export interface ShelterReader {
  getApprovedShelters(limitCount?: number): Promise<readonly Shelter[]>;
  getShelterById(id: string): Promise<Shelter | null>;
  getShelterPrivate(id: string): Promise<ShelterPrivate | null>;
  getShelterByOwner(ownerId: string): Promise<{
    shelter: Shelter | null;
    privateData: ShelterPrivate | null;
  }>;
  getSheltersByStatus(status: ShelterStatus): Promise<readonly Shelter[]>;
  getAllSheltersForAdmin(): Promise<
    readonly { shelter: Shelter; privateData: ShelterPrivate }[]
  >;
  checkIsAdmin(uid: string): Promise<boolean>;
}

export interface ShelterWriter {
  createShelter(
    shelter: Shelter,
    privateData: ShelterPrivate,
    auditLog: AuditLogEntry
  ): Promise<void>;

  updateShelterStatus(params: {
    shelterId: string;
    expectedVersion: number;
    newStatus: ShelterStatus;
    verified: boolean;
    approvedAt: string | null;
    statusReason: string;
    auditLog: AuditLogEntry;
  }): Promise<void>;

  updateUrgency(
    shelterId: string,
    urgency: UrgencyLevelId,
    urgencyNote: string
  ): Promise<void>;

  resubmitShelter(params: {
    shelterId: string;
    expectedVersion: number;
    shelterUpdates: Partial<Shelter>;
    privateUpdates: Partial<ShelterPrivate>;
    auditLog: AuditLogEntry;
  }): Promise<void>;
}

export interface AdminDirectory {
  isAdmin(uid: string): Promise<boolean>;
}

export interface AuditLogger {
  recordLog(entry: AuditLogEntry): Promise<void>;
}
