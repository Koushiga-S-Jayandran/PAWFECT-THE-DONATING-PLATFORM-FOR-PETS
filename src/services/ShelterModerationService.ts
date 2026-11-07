/**
 * Shelter Moderation Service
 * Enforces admin authorization, anti-self-approval, state machine invariants,
 * reason validation, and atomic batch updates with optimistic concurrency control.
 */

import type {
  ShelterReader,
  ShelterWriter,
  AdminDirectory,
} from '../domain/shelterInterfaces.js';
import type {
  ShelterStatus,
  AuditLogEntry,
} from '../domain/shelterEntities.js';
import {
  NotAuthorizedError,
  ValidationError,
  StaleVersionError,
} from '../domain/shelterErrors.js';
import { validateStatusTransition } from '../state-machines/shelterStateMachine.js';
import { moderationActionSchema } from '../security/shelterValidation.js';

export class ShelterModerationService {
  constructor(
    private shelterReader: ShelterReader,
    private shelterWriter: ShelterWriter,
    private adminDirectory: AdminDirectory
  ) {}

  async changeStatus(params: {
    adminUid: string;
    shelterId: string;
    expectedVersion: number;
    newStatus: ShelterStatus;
    reason?: string;
  }): Promise<void> {
    const { adminUid, shelterId, expectedVersion, newStatus, reason } = params;

    // 1. Authorize Admin
    const isAdmin = await this.adminDirectory.isAdmin(adminUid);
    if (!isAdmin) {
      throw new NotAuthorizedError('Access denied: Admin privileges required.');
    }

    // 2. Anti-Self-Approval Guard: Admin cannot moderate own shelter
    if (adminUid === shelterId) {
      throw new NotAuthorizedError(
        'Admins cannot approve, reject, suspend, or moderate their own registered shelter.'
      );
    }

    // 3. Fetch current shelter state
    const currentShelter = await this.shelterReader.getShelterById(shelterId);
    if (!currentShelter) {
      throw new ValidationError('Shelter not found.');
    }

    // 4. Validate Version Concurrency
    if (currentShelter.statusVersion !== expectedVersion) {
      throw new StaleVersionError(expectedVersion, currentShelter.statusVersion);
    }

    // 5. Validate Transition via State Machine
    const rule = validateStatusTransition({
      fromStatus: currentShelter.status,
      toStatus: newStatus,
      actorType: 'ADMIN',
      actorId: adminUid,
      shelterOwnerId: shelterId,
      currentResubmitCount: currentShelter.resubmitCount,
      reason,
    });

    let sanitizedReason = '';
    if (rule.reasonRequired) {
      const parsedReason = moderationActionSchema.safeParse({ reason });
      if (!parsedReason.success) {
        throw new ValidationError(
          'A valid reason between 10 and 300 characters is required.'
        );
      }
      sanitizedReason = parsedReason.data.reason;
    }

    const nowIso = new Date().toISOString();
    const verified = rule.setsVerified === true ? true : rule.setsVerified === false ? false : currentShelter.verified;
    const approvedAt = newStatus === 'APPROVED' ? nowIso : currentShelter.approvedAt;
    const finalReason = newStatus === 'APPROVED' ? '' : sanitizedReason;

    const auditLog: AuditLogEntry = {
      shelterId,
      actorId: adminUid,
      actorType: 'ADMIN',
      action: `STATUS_CHANGE_TO_${newStatus}`,
      fromStatus: currentShelter.status,
      toStatus: newStatus,
      reason: sanitizedReason,
      createdAt: nowIso,
    };

    // 6. Commit atomic update with optimistic lock
    await this.shelterWriter.updateShelterStatus({
      shelterId,
      expectedVersion,
      newStatus,
      verified,
      approvedAt,
      statusReason: finalReason,
      auditLog,
    });
  }
}
