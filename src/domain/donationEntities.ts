/**
 * Domain Entities for Pawfect Donation & Gift Giving System
 */

import type { DonationStatus } from '../config/donationConfig.js';

export interface ShelterPayInfo {
  readonly shelterId: string;
  readonly upiId: string;
  readonly upiHolderName: string;
  readonly shelterName: string;
  readonly verified: boolean;
  readonly updatedAt: string | number;
}

export interface Donation {
  readonly id: string;
  readonly reference: string;
  readonly donorUid: string;
  readonly donorName: string;
  readonly donorEmail: string;
  readonly donorPhone?: string;

  // Shelter details (safe snapshot from shelterPayInfo)
  readonly shelterId: string;
  readonly shelterName: string;
  readonly shelterState: string;
  readonly shelterDistrict: string;
  readonly shelterUpiId: string;
  readonly shelterPayeeName: string;

  // Gift item & pricing
  readonly giftId: string;
  readonly giftName: string;
  readonly quantity: number;
  readonly unitPricePaise: number;
  readonly amountPaise: number; // Strictly quantity * unitPricePaise or customAmountPaise

  // Status and Concurrency
  readonly status: DonationStatus;
  readonly statusReason?: string;
  readonly statusVersion: number;

  // Lifecycle Timestamps
  readonly createdAt: string | number;
  readonly expiresAt: string | number;
  readonly updatedAt: string | number;

  // Payment Links & Notes
  readonly upiIntentUrl: string;
  readonly donorNote?: string;
  readonly dedicationName?: string;
  readonly dedicationMessage?: string;
}

export type DonationActorType = 'DONOR' | 'SYSTEM' | 'ADMIN';

export interface DonationAuditEntry {
  readonly id?: string;
  readonly donationId: string;
  readonly reference: string;
  readonly fromStatus: DonationStatus;
  readonly toStatus: DonationStatus;
  readonly actorUid: string;
  readonly actorType: DonationActorType;
  readonly reason?: string;
  readonly timestamp: string | number;
}
