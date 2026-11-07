/**
 * Currency & Money Utilities (Paise <-> Rupees)
 * All monetary calculations are performed in integer paise to eliminate floating-point drift.
 */

import { getGiftById } from '../config/giftCatalog.js';
import { DonationValidationError } from '../domain/donationErrors.js';
import { DONATION_CONFIG } from '../config/donationConfig.js';

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatRupees(paise: number): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function calculateGiftTotalPaise(params: {
  giftId: string;
  quantity: number;
  customAmountRupees?: number;
}): {
  unitPricePaise: number;
  totalAmountPaise: number;
} {
  const { giftId, quantity, customAmountRupees } = params;
  const gift = getGiftById(giftId);

  if (!gift) {
    throw new DonationValidationError(`Invalid gift '${giftId}' selected.`);
  }

  if (gift.isCustom) {
    if (!customAmountRupees || isNaN(customAmountRupees)) {
      throw new DonationValidationError('Please enter a valid contribution amount.');
    }
    const customPaise = rupeesToPaise(customAmountRupees);
    if (customPaise < DONATION_CONFIG.MIN_CUSTOM_AMOUNT_PAISE) {
      throw new DonationValidationError(
        `Minimum contribution is ${formatRupees(DONATION_CONFIG.MIN_CUSTOM_AMOUNT_PAISE)}.`
      );
    }
    if (customPaise > DONATION_CONFIG.MAX_CUSTOM_AMOUNT_PAISE) {
      throw new DonationValidationError(
        `Maximum contribution is ${formatRupees(DONATION_CONFIG.MAX_CUSTOM_AMOUNT_PAISE)}.`
      );
    }
    return {
      unitPricePaise: customPaise,
      totalAmountPaise: customPaise,
    };
  }

  // Standard fixed price catalog gift
  if (!Number.isInteger(quantity) || quantity < gift.minQuantity) {
    throw new DonationValidationError(
      `Quantity must be at least ${gift.minQuantity} for '${gift.name}'.`
    );
  }

  if (quantity > gift.maxQuantity) {
    throw new DonationValidationError(
      `Quantity cannot exceed ${gift.maxQuantity} for '${gift.name}'.`
    );
  }

  const totalAmountPaise = quantity * gift.unitPricePaise;
  return {
    unitPricePaise: gift.unitPricePaise,
    totalAmountPaise,
  };
}
