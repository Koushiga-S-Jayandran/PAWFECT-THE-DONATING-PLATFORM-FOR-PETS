/**
 * Firebase Firestore Proof Repository
 * Atomically handles proof submissions, UTR guards, hash checks, and transaction reviews.
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase.js';
import type {
  DonationProof,
  EnhancedDonation,
  Step2BDonationAuditEntry,
} from '../domain/proofEntities.js';
import type {
  ProofReader,
  ProofWriter,
  UtrRegistry,
  HashRegistry,
  SubmitProofBatchParams,
} from '../domain/proofInterfaces.js';
import {
  UtrAlreadyUsedError,
  StaleVersionError,
  NotAuthorizedError,
  IllegalTransitionError,
} from '../domain/proofErrors.js';

export class FirebaseProofRepository
  implements ProofReader, ProofWriter, UtrRegistry, HashRegistry
{
  async isUtrUsed(utr: string): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, 'utrGuards', utr));
      return snap.exists();
    } catch (error) {
      // In firestore rules, utrGuards is create-only and no-read for donors
      // If permission-denied is returned, we check during batch write or assume false for pre-check
      return false;
    }
  }

  async isHashPresent(hash: string): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, 'proofHashes', hash));
      return snap.exists();
    } catch (error) {
      return false;
    }
  }

  async getProofById(id: string): Promise<DonationProof | null> {
    try {
      const snap = await getDoc(doc(db, 'donationProofs', id));
      if (!snap.exists()) return null;
      return snap.data() as DonationProof;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `donationProofs/${id}`);
    }
  }

  async getProofsForDonation(donationId: string): Promise<DonationProof[]> {
    try {
      const q = query(
        collection(db, 'donationProofs'),
        where('donationId', '==', donationId),
        orderBy('attempt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as DonationProof);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'donationProofs');
    }
  }

  async getLatestProofForDonation(
    donationId: string
  ): Promise<DonationProof | null> {
    const proofs = await this.getProofsForDonation(donationId);
    if (!proofs.length) return null;
    return proofs[proofs.length - 1];
  }

  async submitProofAtomic(params: SubmitProofBatchParams): Promise<void> {
    const { donation, proof, newStatusVersion, isNewHash, audit } = params;

    // Check UTR duplicate
    const utrDocRef = doc(db, 'utrGuards', proof.utr);
    try {
      const utrSnap = await getDoc(utrDocRef);
      if (utrSnap.exists()) {
        throw new UtrAlreadyUsedError();
      }
    } catch (err) {
      if (err instanceof UtrAlreadyUsedError) throw err;
      // Continue if rule prevents direct read; Firestore batch create rule will reject if exists
    }

    const batch = writeBatch(db);

    // 1. donationProofs/{donationId}_a{attempt}
    const proofRef = doc(db, 'donationProofs', proof.id);
    batch.set(proofRef, {
      ...proof,
      createdAt: Date.now(),
    });

    // 2. utrGuards/{utr} (create-only lock)
    batch.set(utrDocRef, {
      utr: proof.utr,
      donationId: donation.id,
      donorId: proof.donorId,
      createdAt: Date.now(),
    });

    // 3. proofHashes/{hash} (create-only if new)
    if (isNewHash) {
      const hashRef = doc(db, 'proofHashes', proof.imageHash);
      batch.set(hashRef, {
        hash: proof.imageHash,
        donationId: donation.id,
        createdAt: Date.now(),
      });
    }

    // 4. Update donation to PROOF_SUBMITTED
    const donationRef = doc(db, 'donations', donation.id);
    batch.update(donationRef, {
      status: 'PROOF_SUBMITTED',
      statusVersion: newStatusVersion,
      proofSubmittedAt: Date.now(),
      latestProofAttempt: proof.attempt,
      updatedAt: Date.now(),
    });

    // 5. Audit entry in donationAuditLogs
    const auditRef = doc(
      db,
      'donationAuditLogs',
      `${donation.id}_v${newStatusVersion}`
    );
    batch.set(auditRef, {
      ...audit,
      timestamp: Date.now(),
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `donations/${donation.id}`
      );
    }
  }

  async confirmShelterPayment(params: {
    donationId: string;
    shelterId: string;
    expectedVersion: number;
    actorUid: string;
  }): Promise<EnhancedDonation> {
    const { donationId, shelterId, expectedVersion, actorUid } = params;
    const donationRef = doc(db, 'donations', donationId);

    try {
      return await runTransaction(db, async (tx) => {
        const snap = await tx.get(donationRef);
        if (!snap.exists()) {
          throw new Error('Donation not found');
        }

        const data = snap.data() as EnhancedDonation;

        if (data.statusVersion !== expectedVersion) {
          throw new StaleVersionError();
        }

        if (data.shelterId !== shelterId || actorUid !== shelterId) {
          throw new NotAuthorizedError(
            'You can only confirm payments for your own shelter.'
          );
        }

        if (data.donorUid === actorUid) {
          throw new NotAuthorizedError(
            'Shelter owners cannot confirm their own donations.'
          );
        }

        if (data.status !== 'PROOF_SUBMITTED') {
          throw new IllegalTransitionError(
            data.status,
            'CONFIRMED',
            'Only donations with submitted proof can be confirmed.'
          );
        }

        const now = Date.now();
        const nextVersion = data.statusVersion + 1;

        tx.update(donationRef, {
          status: 'CONFIRMED',
          statusVersion: nextVersion,
          confirmedAt: now,
          updatedAt: now,
        });

        const auditRef = doc(
          db,
          'donationAuditLogs',
          `${donationId}_v${nextVersion}`
        );
        tx.set(auditRef, {
          donationId,
          reference: data.reference,
          fromStatus: 'PROOF_SUBMITTED',
          toStatus: 'CONFIRMED',
          actorUid,
          actorType: 'SHELTER',
          timestamp: now,
        });

        return {
          ...data,
          status: 'CONFIRMED',
          statusVersion: nextVersion,
          confirmedAt: now,
          updatedAt: now,
        };
      });
    } catch (error) {
      if (
        error instanceof StaleVersionError ||
        error instanceof NotAuthorizedError ||
        error instanceof IllegalTransitionError
      ) {
        throw error;
      }
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `donations/${donationId}`
      );
    }
  }

  async rejectShelterPayment(params: {
    donationId: string;
    shelterId: string;
    expectedVersion: number;
    reason: string;
    actorUid: string;
  }): Promise<EnhancedDonation> {
    const { donationId, shelterId, expectedVersion, reason, actorUid } = params;
    const donationRef = doc(db, 'donations', donationId);

    try {
      return await runTransaction(db, async (tx) => {
        const snap = await tx.get(donationRef);
        if (!snap.exists()) {
          throw new Error('Donation not found');
        }

        const data = snap.data() as EnhancedDonation;

        if (data.statusVersion !== expectedVersion) {
          throw new StaleVersionError();
        }

        if (data.shelterId !== shelterId || actorUid !== shelterId) {
          throw new NotAuthorizedError(
            'You can only reject payments for your own shelter.'
          );
        }

        if (data.status !== 'PROOF_SUBMITTED') {
          throw new IllegalTransitionError(
            data.status,
            'REJECTED',
            'Only donations with submitted proof can be rejected.'
          );
        }

        const now = Date.now();
        const nextVersion = data.statusVersion + 1;
        const currentRejections = data.rejectionCount || 0;
        const nextRejectionCount = currentRejections + 1;

        tx.update(donationRef, {
          status: 'REJECTED',
          statusVersion: nextVersion,
          rejectionReason: reason.trim(),
          rejectionCount: nextRejectionCount,
          updatedAt: now,
        });

        const auditRef = doc(
          db,
          'donationAuditLogs',
          `${donationId}_v${nextVersion}`
        );
        tx.set(auditRef, {
          donationId,
          reference: data.reference,
          fromStatus: 'PROOF_SUBMITTED',
          toStatus: 'REJECTED',
          actorUid,
          actorType: 'SHELTER',
          reason: reason.trim(),
          timestamp: now,
        });

        return {
          ...data,
          status: 'REJECTED',
          statusVersion: nextVersion,
          rejectionReason: reason.trim(),
          rejectionCount: nextRejectionCount,
          updatedAt: now,
        };
      });
    } catch (error) {
      if (
        error instanceof StaleVersionError ||
        error instanceof NotAuthorizedError ||
        error instanceof IllegalTransitionError
      ) {
        throw error;
      }
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `donations/${donationId}`
      );
    }
  }

  async disputeDonation(params: {
    donationId: string;
    expectedVersion: number;
    actorUid: string;
  }): Promise<EnhancedDonation> {
    const { donationId, expectedVersion, actorUid } = params;
    const donationRef = doc(db, 'donations', donationId);

    try {
      return await runTransaction(db, async (tx) => {
        const snap = await tx.get(donationRef);
        if (!snap.exists()) {
          throw new Error('Donation not found');
        }

        const data = snap.data() as EnhancedDonation;

        if (data.statusVersion !== expectedVersion) {
          throw new StaleVersionError();
        }

        if (data.donorUid !== actorUid) {
          throw new NotAuthorizedError(
            'Only the donor can dispute this donation.'
          );
        }

        if (data.status !== 'REJECTED') {
          throw new IllegalTransitionError(
            data.status,
            'DISPUTED',
            'Only rejected donations can be disputed.'
          );
        }

        const now = Date.now();
        const nextVersion = data.statusVersion + 1;

        tx.update(donationRef, {
          status: 'DISPUTED',
          statusVersion: nextVersion,
          disputedAt: now,
          updatedAt: now,
        });

        const auditRef = doc(
          db,
          'donationAuditLogs',
          `${donationId}_v${nextVersion}`
        );
        tx.set(auditRef, {
          donationId,
          reference: data.reference,
          fromStatus: 'REJECTED',
          toStatus: 'DISPUTED',
          actorUid,
          actorType: 'DONOR',
          timestamp: now,
        });

        return {
          ...data,
          status: 'DISPUTED',
          statusVersion: nextVersion,
          disputedAt: now,
          updatedAt: now,
        };
      });
    } catch (error) {
      if (
        error instanceof StaleVersionError ||
        error instanceof NotAuthorizedError ||
        error instanceof IllegalTransitionError
      ) {
        throw error;
      }
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `donations/${donationId}`
      );
    }
  }
}
