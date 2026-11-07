/**
 * Donation Creation Service
 * Orchestrates gift price resolution, reference generation, UPI intent creation,
 * and atomic batch persistence with reference uniqueness guard.
 */

import { getGiftById } from '../config/giftCatalog.js';
import { calculateGiftTotalPaise } from '../utils/money.js';
import { generateDonationReference } from '../utils/referenceGenerator.js';
import { calculateExpiryTimestamp } from '../utils/dateUtils.js';
import { buildUpiLink } from '../security/upiLink.js';
import type { Donation, DonationAuditEntry, ShelterPayInfo } from '../domain/donationEntities.js';
import type { DonationReader, DonationWriter } from '../domain/donationInterfaces.js';
import type { ShelterReader } from '../domain/shelterInterfaces.js';
import {
  DonationValidationError,
  ShelterNotPayableError,
} from '../domain/donationErrors.js';

export interface CreateDonationParams {
  donorUid: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  shelterId: string;
  giftId: string;
  quantity: number;
  customAmountRupees?: number;
  donorNote?: string;
  dedicationName?: string;
  dedicationMessage?: string;
}

export class DonationCreationService {
  constructor(
    private readonly donationWriter: DonationWriter,
    private readonly donationReader: DonationReader,
    private readonly shelterReader: ShelterReader
  ) {}

  async createDonation(params: CreateDonationParams): Promise<Donation> {
    const {
      donorUid,
      donorName,
      donorEmail,
      donorPhone,
      shelterId,
      giftId,
      quantity,
      customAmountRupees,
      donorNote,
      dedicationName,
      dedicationMessage,
    } = params;

    // 1. Verify Donor Info
    if (!donorUid || !donorEmail) {
      throw new DonationValidationError('A signed-in verified donor is required.');
    }

    // 2. Resolve Shelter and verify it is APPROVED
    const shelter = await this.shelterReader.getShelterById(shelterId);
    if (!shelter) {
      throw new ShelterNotPayableError(shelterId, 'Shelter not found.');
    }

    if (shelter.status !== 'APPROVED') {
      throw new ShelterNotPayableError(
        shelterId,
        `Shelter is in status '${shelter.status}'. Only APPROVED shelters can receive gifts.`
      );
    }

    // 3. Resolve safe shelter payment info (UPI)
    // Note: If shelterPayInfo document does not exist yet, we check private details
    // if caller is authorized or fallback to shelter record
    let payInfo = await this.donationReader.getShelterPayInfo(shelterId);
    if (!payInfo) {
      // Fetch private details from repository to bootstrap shelterPayInfo if not yet written
      const priv = await this.shelterReader.getShelterPrivate(shelterId);
      if (priv && priv.upiId && priv.upiHolderName) {
        payInfo = {
          shelterId,
          upiId: priv.upiId,
          upiHolderName: priv.upiHolderName,
          shelterName: shelter.name,
          verified: true,
          updatedAt: Date.now(),
        };
        // Persist safe copy
        await this.donationWriter.saveShelterPayInfo(payInfo);
      } else {
        throw new ShelterNotPayableError(
          shelterId,
          'Shelter has not configured verified UPI payment details.'
        );
      }
    }

    // 4. Resolve gift price and compute amountPaise in integer paise
    const gift = getGiftById(giftId);
    if (!gift) {
      throw new DonationValidationError(`Gift '${giftId}' does not exist in catalog.`);
    }

    const { unitPricePaise, totalAmountPaise } = calculateGiftTotalPaise({
      giftId,
      quantity,
      customAmountRupees,
    });

    // 5. Generate unique reference and timing
    const reference = generateDonationReference();
    const now = Date.now();
    const expiresAt = calculateExpiryTimestamp(now);
    const donationId = `${reference.toLowerCase()}_${now}`;

    // 6. Build NPCI UPI deep link
    const upiNote = `${gift.name} ${reference}`.slice(0, 50);
    const upiIntentUrl = buildUpiLink({
      upiId: payInfo.upiId,
      payeeName: payInfo.upiHolderName,
      amountPaise: totalAmountPaise,
      reference,
      note: upiNote,
    });

    const donation: Donation = {
      id: donationId,
      reference,
      donorUid,
      donorName: donorName || 'Kind Donor',
      donorEmail,
      donorPhone,
      shelterId: shelter.ownerId,
      shelterName: shelter.name,
      shelterState: shelter.stateCode,
      shelterDistrict: shelter.district,
      shelterUpiId: payInfo.upiId,
      shelterPayeeName: payInfo.upiHolderName,
      giftId: gift.id,
      giftName: gift.name,
      quantity,
      unitPricePaise,
      amountPaise: totalAmountPaise,
      status: 'PENDING',
      statusVersion: 1,
      createdAt: now,
      expiresAt,
      updatedAt: now,
      upiIntentUrl,
      donorNote: donorNote ? donorNote.trim().slice(0, 140) : undefined,
      dedicationName: dedicationName ? dedicationName.trim().slice(0, 80) : undefined,
      dedicationMessage: dedicationMessage ? dedicationMessage.trim().slice(0, 200) : undefined,
    };

    const audit: DonationAuditEntry = {
      donationId,
      reference,
      fromStatus: 'PENDING',
      toStatus: 'PENDING',
      actorUid: donorUid,
      actorType: 'DONOR',
      reason: 'Gift donation created by donor',
      timestamp: now,
    };

    // 7. Atomic batch write: donation + reference guard + audit entry
    await this.donationWriter.createDonation({ donation, audit });

    return donation;
  }
}
