/**
 * In-Memory Shelter Repository Test Double
 * Implements identical contracts to FirebaseShelterRepository for unit & contract testing.
 */

import type {
  Shelter,
  ShelterPrivate,
  ShelterStatus,
  AuditLogEntry,
} from '../domain/shelterEntities.js';
import type {
  ShelterReader,
  ShelterWriter,
  AdminDirectory,
  AuditLogger,
} from '../domain/shelterInterfaces.js';
import type { UrgencyLevelId } from '../config/urgencyLevels.js';
import { StaleVersionError } from '../domain/shelterErrors.js';

export class InMemoryShelterRepository
  implements ShelterReader, ShelterWriter, AdminDirectory, AuditLogger
{
  public shelters: Map<string, Shelter> = new Map();
  public shelterPrivates: Map<string, ShelterPrivate> = new Map();
  public auditLogs: Map<string, AuditLogEntry> = new Map();
  public admins: Set<string> = new Set();

  addAdmin(uid: string) {
    this.admins.add(uid);
  }

  async checkIsAdmin(uid: string): Promise<boolean> {
    return this.admins.has(uid);
  }

  async isAdmin(uid: string): Promise<boolean> {
    return this.admins.has(uid);
  }

  async getApprovedShelters(limitCount: number = 200): Promise<readonly Shelter[]> {
    const list: Shelter[] = [];
    for (const shelter of this.shelters.values()) {
      if (shelter.status === 'APPROVED') {
        list.push({ ...shelter });
      }
    }
    return list.slice(0, limitCount);
  }

  async getShelterById(id: string): Promise<Shelter | null> {
    const s = this.shelters.get(id);
    return s ? { ...s } : null;
  }

  async getShelterPrivate(id: string): Promise<ShelterPrivate | null> {
    const p = this.shelterPrivates.get(id);
    return p ? { ...p } : null;
  }

  async getShelterByOwner(ownerId: string): Promise<{
    shelter: Shelter | null;
    privateData: ShelterPrivate | null;
  }> {
    return {
      shelter: await this.getShelterById(ownerId),
      privateData: await this.getShelterPrivate(ownerId),
    };
  }

  async getSheltersByStatus(status: ShelterStatus): Promise<readonly Shelter[]> {
    const list: Shelter[] = [];
    for (const shelter of this.shelters.values()) {
      if (shelter.status === status) {
        list.push({ ...shelter });
      }
    }
    return list;
  }

  async getAllSheltersForAdmin(): Promise<
    readonly { shelter: Shelter; privateData: ShelterPrivate }[]
  > {
    const list: { shelter: Shelter; privateData: ShelterPrivate }[] = [];
    for (const shelter of this.shelters.values()) {
      const privateData = this.shelterPrivates.get(shelter.ownerId);
      if (privateData) {
        list.push({
          shelter: { ...shelter },
          privateData: { ...privateData },
        });
      }
    }
    return list;
  }

  async createShelter(
    shelter: Shelter,
    privateData: ShelterPrivate,
    auditLog: AuditLogEntry
  ): Promise<void> {
    if (this.shelters.has(shelter.ownerId)) {
      throw new Error(`Shelter already exists for owner: ${shelter.ownerId}`);
    }
    this.shelters.set(shelter.ownerId, { ...shelter });
    this.shelterPrivates.set(shelter.ownerId, { ...privateData });
    const auditDocId = `${shelter.ownerId}_v1`;
    this.auditLogs.set(auditDocId, { ...auditLog });
  }

  async updateShelterStatus(params: {
    shelterId: string;
    expectedVersion: number;
    newStatus: ShelterStatus;
    verified: boolean;
    approvedAt: string | null;
    statusReason: string;
    auditLog: AuditLogEntry;
  }): Promise<void> {
    const {
      shelterId,
      expectedVersion,
      newStatus,
      verified,
      approvedAt,
      statusReason,
      auditLog,
    } = params;

    const existing = this.shelters.get(shelterId);
    if (!existing) throw new Error('Shelter not found');

    if (existing.statusVersion !== expectedVersion) {
      throw new StaleVersionError(expectedVersion, existing.statusVersion);
    }

    const nextVersion = expectedVersion + 1;
    const nowIso = new Date().toISOString();

    this.shelters.set(shelterId, {
      ...existing,
      status: newStatus,
      statusVersion: nextVersion,
      verified,
      approvedAt,
      updatedAt: nowIso,
    });

    const priv = this.shelterPrivates.get(shelterId);
    if (priv) {
      this.shelterPrivates.set(shelterId, {
        ...priv,
        statusReason,
      });
    }

    const auditDocId = `${shelterId}_v${nextVersion}`;
    this.auditLogs.set(auditDocId, { ...auditLog });
  }

  async updateUrgency(
    shelterId: string,
    urgency: UrgencyLevelId,
    urgencyNote: string
  ): Promise<void> {
    const existing = this.shelters.get(shelterId);
    if (!existing) throw new Error('Shelter not found');
    if (existing.status !== 'APPROVED') {
      throw new Error('Only approved shelters can update urgency details');
    }

    this.shelters.set(shelterId, {
      ...existing,
      urgency,
      urgencyNote,
      updatedAt: new Date().toISOString(),
    });
  }

  async resubmitShelter(params: {
    shelterId: string;
    expectedVersion: number;
    shelterUpdates: Partial<Shelter>;
    privateUpdates: Partial<ShelterPrivate>;
    auditLog: AuditLogEntry;
  }): Promise<void> {
    const {
      shelterId,
      expectedVersion,
      shelterUpdates,
      privateUpdates,
      auditLog,
    } = params;

    const existing = this.shelters.get(shelterId);
    if (!existing) throw new Error('Shelter not found');

    if (existing.statusVersion !== expectedVersion) {
      throw new StaleVersionError(expectedVersion, existing.statusVersion);
    }

    const nextVersion = expectedVersion + 1;
    const nextResubmit = (existing.resubmitCount || 0) + 1;
    const nowIso = new Date().toISOString();

    this.shelters.set(shelterId, {
      ...existing,
      ...shelterUpdates,
      status: 'PENDING',
      statusVersion: nextVersion,
      resubmitCount: nextResubmit,
      updatedAt: nowIso,
    });

    const priv = this.shelterPrivates.get(shelterId);
    if (priv) {
      this.shelterPrivates.set(shelterId, {
        ...priv,
        ...privateUpdates,
        statusReason: '',
      });
    }

    const auditDocId = `${shelterId}_v${nextVersion}`;
    this.auditLogs.set(auditDocId, { ...auditLog });
  }

  async recordLog(entry: AuditLogEntry): Promise<void> {
    const auditDocId = `${entry.shelterId}_v${Date.now()}`;
    this.auditLogs.set(auditDocId, { ...entry });
  }
}
