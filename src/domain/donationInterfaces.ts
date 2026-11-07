/**
 * Repository and Service Interfaces for Donation Subsystem
 */

import type { Donation, ShelterPayInfo, DonationAuditEntry } from './donationEntities.js';
import type { DonationStatus } from '../config/donationConfig.js';

export interface DonationReader {
  getDonationById(id: string): Promise<Donation | null>;
  getDonationByReference(reference: string): Promise<Donation | null>;
  getDonationsByDonor(donorUid: string): Promise<readonly Donation[]>;
  getDonationsByShelter(shelterId: string): Promise<readonly Donation[]>;
  getShelterPayInfo(shelterId: string): Promise<ShelterPayInfo | null>;
}

export interface DonationWriter {
  createDonation(params: {
    donation: Donation;
    audit: DonationAuditEntry;
  }): Promise<void>;

  updateDonationStatus(params: {
    donationId: string;
    expectedVersion: number;
    newStatus: DonationStatus;
    reason?: string;
    audit: DonationAuditEntry;
  }): Promise<Donation>;

  saveShelterPayInfo(payInfo: ShelterPayInfo): Promise<void>;
}
