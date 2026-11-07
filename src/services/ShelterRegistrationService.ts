/**
 * Shelter Registration Service
 * Coordinates shelter creation, resubmission, and owner urgency updates.
 */

import type {
  ShelterReader,
  ShelterWriter,
} from '../domain/shelterInterfaces.js';
import type {
  Shelter,
  ShelterPrivate,
  AuditLogEntry,
} from '../domain/shelterEntities.js';
import {
  shelterRegistrationSchema,
  urgencyUpdateSchema,
  type ShelterRegistrationFormData,
} from '../security/shelterValidation.js';
import {
  ValidationError,
  NotAuthorizedError,
  IllegalTransitionError,
} from '../domain/shelterErrors.js';
import { validateStatusTransition } from '../state-machines/shelterStateMachine.js';
import type { AnimalTypeId } from '../config/animalTypes.js';
import type { UrgencyLevelId } from '../config/urgencyLevels.js';

export class ShelterRegistrationService {
  constructor(
    private shelterReader: ShelterReader,
    private shelterWriter: ShelterWriter
  ) {}

  async registerShelter(params: {
    ownerId: string;
    isEmailVerified: boolean;
    data: ShelterRegistrationFormData;
  }): Promise<{ shelterId: string }> {
    const { ownerId, isEmailVerified, data } = params;

    if (!isEmailVerified) {
      throw new NotAuthorizedError(
        'Email verification is required before you can register a shelter.'
      );
    }

    // 1. Check if this user already registered a shelter
    const existing = await this.shelterReader.getShelterById(ownerId);
    if (existing) {
      throw new ValidationError(
        'You have already registered a shelter under this account.'
      );
    }

    // 2. Validate input schema
    const parsed = shelterRegistrationSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] = issue.message;
      }
      throw new ValidationError('Validation failed for shelter details.', fieldErrors);
    }

    const valid = parsed.data;
    const nowIso = new Date().toISOString();

    // 3. Assemble public document
    const shelter: Shelter = {
      ownerId,
      name: valid.name,
      stateCode: valid.stateCode,
      district: valid.district,
      area: valid.area,
      animalTypes: valid.animalTypes as AnimalTypeId[],
      description: valid.description,
      urgency: valid.urgency as UrgencyLevelId,
      urgencyNote: valid.urgencyNote || '',
      verified: false,
      status: 'PENDING',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      approvedAt: null,
    };

    // 4. Assemble private document
    const privateData: ShelterPrivate = {
      contactPerson: valid.contactPerson,
      phone: valid.phone,
      fullAddress: valid.fullAddress,
      upiId: valid.upiId,
      upiHolderName: valid.upiHolderName,
      registrationNumber: valid.registrationNumber || '',
      supportLink: valid.supportLink || '',
      statusReason: '',
      consentAt: nowIso,
    };

    // 5. Initial audit log
    const auditLog: AuditLogEntry = {
      shelterId: ownerId,
      actorId: ownerId,
      actorType: 'OWNER',
      action: 'SUBMITTED',
      fromStatus: null,
      toStatus: 'PENDING',
      reason: 'Initial shelter registration submission.',
      createdAt: nowIso,
    };

    // 6. Commit atomic batch
    await this.shelterWriter.createShelter(shelter, privateData, auditLog);

    return { shelterId: ownerId };
  }

  async resubmitShelter(params: {
    ownerId: string;
    isEmailVerified: boolean;
    data: ShelterRegistrationFormData;
  }): Promise<void> {
    const { ownerId, isEmailVerified, data } = params;

    if (!isEmailVerified) {
      throw new NotAuthorizedError('Email verification required.');
    }

    const current = await this.shelterReader.getShelterById(ownerId);
    if (!current) {
      throw new ValidationError('Shelter not found.');
    }

    // Validate state machine transition from REJECTED -> PENDING by OWNER
    validateStatusTransition({
      fromStatus: current.status,
      toStatus: 'PENDING',
      actorType: 'OWNER',
      actorId: ownerId,
      shelterOwnerId: ownerId,
      currentResubmitCount: current.resubmitCount,
    });

    const parsed = shelterRegistrationSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError('Validation failed for updated shelter details.');
    }

    const valid = parsed.data;
    const nowIso = new Date().toISOString();

    const shelterUpdates: Partial<Shelter> = {
      name: valid.name,
      stateCode: valid.stateCode,
      district: valid.district,
      area: valid.area,
      animalTypes: valid.animalTypes as AnimalTypeId[],
      description: valid.description,
      urgency: valid.urgency as UrgencyLevelId,
      urgencyNote: valid.urgencyNote || '',
    };

    const privateUpdates: Partial<ShelterPrivate> = {
      contactPerson: valid.contactPerson,
      phone: valid.phone,
      fullAddress: valid.fullAddress,
      upiId: valid.upiId,
      upiHolderName: valid.upiHolderName,
      registrationNumber: valid.registrationNumber || '',
      supportLink: valid.supportLink || '',
    };

    const auditLog: AuditLogEntry = {
      shelterId: ownerId,
      actorId: ownerId,
      actorType: 'OWNER',
      action: 'RESUBMITTED',
      fromStatus: current.status,
      toStatus: 'PENDING',
      reason: 'Resubmitted after fixing requested details.',
      createdAt: nowIso,
    };

    await this.shelterWriter.resubmitShelter({
      shelterId: ownerId,
      expectedVersion: current.statusVersion,
      shelterUpdates,
      privateUpdates,
      auditLog,
    });
  }

  async updateUrgency(params: {
    ownerId: string;
    urgency: UrgencyLevelId;
    urgencyNote: string;
  }): Promise<void> {
    const { ownerId, urgency, urgencyNote } = params;
    const parsed = urgencyUpdateSchema.safeParse({ urgency, urgencyNote });
    if (!parsed.success) {
      throw new ValidationError('Invalid urgency update parameters.');
    }

    await this.shelterWriter.updateUrgency(
      ownerId,
      parsed.data.urgency,
      parsed.data.urgencyNote || ''
    );
  }
}
