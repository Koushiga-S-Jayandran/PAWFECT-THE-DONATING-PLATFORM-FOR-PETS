/**
 * In-Memory Implementation of Donation Repository for Tests and Isolated Execution
 */

import type { Donation, ShelterPayInfo, DonationAuditEntry } from '../domain/donationEntities.js';
import type { DonationReader, DonationWriter } from '../domain/donationInterfaces.js';
import type { DonationStatus } from '../config/donationConfig.js';
import {
  DonationNotFoundError,
  DuplicateReferenceError,
} from '../domain/donationErrors.js';
import { StaleVersionError } from '../domain/shelterErrors.js';

export class InMemoryDonationRepository implements DonationReader, DonationWriter {
  private readonly donations = new Map<string, Donation>();
  private readonly references = new Map<string, string>(); // reference -> donationId
  private readonly payInfo = new Map<string, ShelterPayInfo>(); // shelterId -> ShelterPayInfo
  private readonly auditLogs: DonationAuditEntry[] = [];

  async getDonationById(id: string): Promise<Donation | null> {
    return this.donations.get(id) || null;
  }

  async getDonationByReference(reference: string): Promise<Donation | null> {
    const id = this.references.get(reference);
    if (!id) return null;
    return this.donations.get(id) || null;
  }

  async getDonationsByDonor(donorUid: string): Promise<readonly Donation[]> {
    return Array.from(this.donations.values())
      .filter((d) => d.donorUid === donorUid)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  async getDonationsByShelter(shelterId: string): Promise<readonly Donation[]> {
    return Array.from(this.donations.values())
      .filter((d) => d.shelterId === shelterId)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  async getShelterPayInfo(shelterId: string): Promise<ShelterPayInfo | null> {
    return this.payInfo.get(shelterId) || null;
  }

  async saveShelterPayInfo(payInfo: ShelterPayInfo): Promise<void> {
    this.payInfo.set(payInfo.shelterId, {
      ...payInfo,
      updatedAt: Date.now(),
    });
  }

  async createDonation(params: {
    donation: Donation;
    audit: DonationAuditEntry;
  }): Promise<void> {
    const { donation, audit } = params;

    if (this.references.has(donation.reference)) {
      throw new DuplicateReferenceError(donation.reference);
    }

    this.donations.set(donation.id, donation);
    this.references.set(donation.reference, donation.id);
    this.auditLogs.push(audit);
  }

  async updateDonationStatus(params: {
    donationId: string;
    expectedVersion: number;
    newStatus: DonationStatus;
    reason?: string;
    audit: DonationAuditEntry;
  }): Promise<Donation> {
    const { donationId, expectedVersion, newStatus, reason, audit } = params;
    const current = this.donations.get(donationId);

    if (!current) {
      throw new DonationNotFoundError(donationId);
    }

    if (current.statusVersion !== expectedVersion) {
      throw new StaleVersionError(expectedVersion, current.statusVersion);
    }

    const updated: Donation = {
      ...current,
      status: newStatus,
      statusReason: reason || current.statusReason,
      statusVersion: current.statusVersion + 1,
      updatedAt: Date.now(),
    };

    this.donations.set(donationId, updated);
    this.auditLogs.push({
      ...audit,
      fromStatus: current.status,
      toStatus: newStatus,
      timestamp: Date.now(),
    });

    return updated;
  }

  // Test inspection helper
  getAuditLogs(): readonly DonationAuditEntry[] {
    return this.auditLogs;
  }

  clear(): void {
    this.donations.clear();
    this.references.clear();
    this.payInfo.clear();
    this.auditLogs.length = 0;
  }
}
