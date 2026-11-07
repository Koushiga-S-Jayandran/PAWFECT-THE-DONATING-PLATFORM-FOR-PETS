/**
 * Firebase Firestore Shelter Repository Implementation
 * Handles atomic batches/transactions for public, private, and audit log records.
 */

import {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
  limit,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase.js';
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

export class FirebaseShelterRepository
  implements ShelterReader, ShelterWriter, AdminDirectory, AuditLogger
{
  async checkIsAdmin(uid: string): Promise<boolean> {
    if (!uid) return false;
    const path = `admins/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'admins', uid));
      return snap.exists();
    } catch {
      return false;
    }
  }

  async isAdmin(uid: string): Promise<boolean> {
    return this.checkIsAdmin(uid);
  }

  async getApprovedShelters(limitCount: number = 200): Promise<readonly Shelter[]> {
    const path = 'shelters';
    try {
      const q = query(
        collection(db, 'shelters'),
        where('status', '==', 'APPROVED'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      const list: Shelter[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Shelter);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async getShelterById(id: string): Promise<Shelter | null> {
    const path = `shelters/${id}`;
    try {
      const snap = await getDoc(doc(db, 'shelters', id));
      if (!snap.exists()) return null;
      return snap.data() as Shelter;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async getShelterPrivate(id: string): Promise<ShelterPrivate | null> {
    const path = `shelterPrivate/${id}`;
    try {
      const snap = await getDoc(doc(db, 'shelterPrivate', id));
      if (!snap.exists()) return null;
      return snap.data() as ShelterPrivate;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async getShelterByOwner(ownerId: string): Promise<{
    shelter: Shelter | null;
    privateData: ShelterPrivate | null;
  }> {
    const [shelter, privateData] = await Promise.all([
      this.getShelterById(ownerId),
      this.getShelterPrivate(ownerId),
    ]);
    return { shelter, privateData };
  }

  async getSheltersByStatus(status: ShelterStatus): Promise<readonly Shelter[]> {
    const path = 'shelters';
    try {
      const q = query(
        collection(db, 'shelters'),
        where('status', '==', status),
        limit(200)
      );
      const snap = await getDocs(q);
      const list: Shelter[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Shelter);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async getAllSheltersForAdmin(): Promise<
    readonly { shelter: Shelter; privateData: ShelterPrivate }[]
  > {
    const path = 'shelters';
    try {
      const snap = await getDocs(collection(db, 'shelters'));
      const results: { shelter: Shelter; privateData: ShelterPrivate }[] = [];

      for (const docSnap of snap.docs) {
        const shelter = docSnap.data() as Shelter;
        const privateSnap = await getDoc(doc(db, 'shelterPrivate', shelter.ownerId));
        if (privateSnap.exists()) {
          results.push({
            shelter,
            privateData: privateSnap.data() as ShelterPrivate,
          });
        }
      }

      return results;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async createShelter(
    shelter: Shelter,
    privateData: ShelterPrivate,
    auditLog: AuditLogEntry
  ): Promise<void> {
    const shelterRef = doc(db, 'shelters', shelter.ownerId);
    const privateRef = doc(db, 'shelterPrivate', shelter.ownerId);
    const auditDocId = `${shelter.ownerId}_v1`;
    const auditRef = doc(db, 'auditLogs', auditDocId);

    try {
      const batch = writeBatch(db);
      batch.set(shelterRef, shelter);
      batch.set(privateRef, privateData);
      batch.set(auditRef, auditLog);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `shelters/${shelter.ownerId}`);
    }
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

    const shelterRef = doc(db, 'shelters', shelterId);
    const privateRef = doc(db, 'shelterPrivate', shelterId);
    const nextVersion = expectedVersion + 1;
    const auditDocId = `${shelterId}_v${nextVersion}`;
    const auditRef = doc(db, 'auditLogs', auditDocId);

    try {
      await runTransaction(db, async (transaction) => {
        const currentShelterSnap = await transaction.get(shelterRef);
        if (!currentShelterSnap.exists()) {
          throw new Error('Shelter not found');
        }

        const data = currentShelterSnap.data();
        if (data.statusVersion !== expectedVersion) {
          throw new StaleVersionError(expectedVersion, data.statusVersion);
        }

        const nowIso = new Date().toISOString();

        // 1. Update public shelter doc
        transaction.update(shelterRef, {
          status: newStatus,
          statusVersion: nextVersion,
          verified,
          approvedAt,
          updatedAt: nowIso,
        });

        // 2. Update private shelter doc statusReason
        transaction.update(privateRef, {
          statusReason,
        });

        // 3. Write immutable audit log
        transaction.set(auditRef, auditLog);
      });
    } catch (error) {
      if (error instanceof StaleVersionError) {
        throw error;
      }
      handleFirestoreError(error, OperationType.UPDATE, `shelters/${shelterId}`);
    }
  }

  async updateUrgency(
    shelterId: string,
    urgency: UrgencyLevelId,
    urgencyNote: string
  ): Promise<void> {
    const path = `shelters/${shelterId}`;
    try {
      const nowIso = new Date().toISOString();
      const shelterRef = doc(db, 'shelters', shelterId);
      const snap = await getDoc(shelterRef);
      if (!snap.exists()) throw new Error('Shelter not found');
      if (snap.data().status !== 'APPROVED') {
        throw new Error('Only approved shelters can update urgency details');
      }

      const batch = writeBatch(db);
      batch.update(shelterRef, {
        urgency,
        urgencyNote,
        updatedAt: nowIso,
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
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

    const shelterRef = doc(db, 'shelters', shelterId);
    const privateRef = doc(db, 'shelterPrivate', shelterId);
    const nextVersion = expectedVersion + 1;
    const auditDocId = `${shelterId}_v${nextVersion}`;
    const auditRef = doc(db, 'auditLogs', auditDocId);

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(shelterRef);
        if (!snap.exists()) throw new Error('Shelter not found');
        const data = snap.data();
        if (data.statusVersion !== expectedVersion) {
          throw new StaleVersionError(expectedVersion, data.statusVersion);
        }

        const nextResubmitCount = (data.resubmitCount || 0) + 1;
        const nowIso = new Date().toISOString();

        transaction.update(shelterRef, {
          ...shelterUpdates,
          status: 'PENDING',
          statusVersion: nextVersion,
          resubmitCount: nextResubmitCount,
          updatedAt: nowIso,
        });

        transaction.update(privateRef, {
          ...privateUpdates,
          statusReason: '',
        });

        transaction.set(auditRef, auditLog);
      });
    } catch (error) {
      if (error instanceof StaleVersionError) throw error;
      handleFirestoreError(error, OperationType.UPDATE, `shelters/${shelterId}`);
    }
  }

  async recordLog(entry: AuditLogEntry): Promise<void> {
    const docId = `${entry.shelterId}_v${Date.now()}`;
    const auditRef = doc(db, 'auditLogs', docId);
    const batch = writeBatch(db);
    batch.set(auditRef, entry);
    await batch.commit();
  }
}
