/**
 * Donation Lifecycle Service
 * Manages queries, donor cancellations, and TTL expiry transitions.
 */

import type { Donation, DonationAuditEntry } from '../domain/donationEntities.js';
import type { DonationReader, DonationWriter } from '../domain/donationInterfaces.js';
import {
  assertLegalDonationTransition,
} from '../state-machines/donationStateMachine.js';
import { isDonationExpired } from '../utils/dateUtils.js';
import {
  DonationNotFoundError,
  DonationStateError,
} from '../domain/donationErrors.js';

export class DonationLifecycleService {
  constructor(
    private readonly donationReader: DonationReader,
    private readonly donationWriter: DonationWriter
  ) {}

  async getDonation(identifier: string, requesterUid?: string): Promise<Donation | null> {
    let donation = await this.donationReader.getDonationById(identifier);
    if (!donation) {
      donation = await this.donationReader.getDonationByReference(identifier);
    }
    if (!donation) return null;

    // Zero-Trust check: If requester is provided and not the donor or shelter owner,
    // only expose if authorized
    if (requesterUid && donation.donorUid !== requesterUid && donation.shelterId !== requesterUid) {
      // In donor context, donors cannot spy on other donors' gifts
      return null;
    }

    // Auto-expire if past TTL and still pending
    if (donation.status === 'PENDING' && isDonationExpired(donation.expiresAt)) {
      try {
        donation = await this.expireDonation(donation.id, 'TTL window expired (30 minutes)');
      } catch {
        // If concurrent update occurred, return latest
      }
    }

    return donation;
  }

  async getDonationsForDonor(donorUid: string): Promise<readonly Donation[]> {
    if (!donorUid) return [];
    return this.donationReader.getDonationsByDonor(donorUid);
  }

  async cancelDonation(donationId: string, donorUid: string, reason?: string): Promise<Donation> {
    const current = await this.donationReader.getDonationById(donationId);
    if (!current) {
      throw new DonationNotFoundError(donationId);
    }

    // Validate state machine
    assertLegalDonationTransition({
      fromStatus: current.status,
      toStatus: 'CANCELLED',
      actorType: 'DONOR',
      actorUid: donorUid,
      donorUid: current.donorUid,
      reason,
    });

    const audit: DonationAuditEntry = {
      donationId,
      reference: current.reference,
      fromStatus: current.status,
      toStatus: 'CANCELLED',
      actorUid: donorUid,
      actorType: 'DONOR',
      reason: reason || 'Cancelled by donor',
      timestamp: Date.now(),
    };

    return this.donationWriter.updateDonationStatus({
      donationId,
      expectedVersion: current.statusVersion,
      newStatus: 'CANCELLED',
      reason: reason || 'Cancelled by donor',
      audit,
    });
  }

  async expireDonation(donationId: string, reason: string = 'TTL window expired'): Promise<Donation> {
    const current = await this.donationReader.getDonationById(donationId);
    if (!current) {
      throw new DonationNotFoundError(donationId);
    }

    if (current.status !== 'PENDING') {
      return current;
    }

    const audit: DonationAuditEntry = {
      donationId,
      reference: current.reference,
      fromStatus: current.status,
      toStatus: 'EXPIRED',
      actorUid: 'system',
      actorType: 'SYSTEM',
      reason,
      timestamp: Date.now(),
    };

    return this.donationWriter.updateDonationStatus({
      donationId,
      expectedVersion: current.statusVersion,
      newStatus: 'EXPIRED',
      reason,
      audit,
    });
  }
}
