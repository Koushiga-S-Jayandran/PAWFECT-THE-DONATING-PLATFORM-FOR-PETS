/**
 * Donation Reference Generator
 * Generates human-friendly, unambiguous unique alphanumeric reference IDs
 * e.g., PWF-8X9K2M4P
 */

import { DONATION_CONFIG } from '../config/donationConfig.js';

// Unambiguous character set (no 0, O, 1, I, L)
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateDonationReference(): string {
  const chars: string[] = [];
  const length = DONATION_CONFIG.REFERENCE_LENGTH - DONATION_CONFIG.REFERENCE_PREFIX.length - 1;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    chars.push(CHARSET[randomIndex]);
  }

  return `${DONATION_CONFIG.REFERENCE_PREFIX}-${chars.join('')}`;
}

export function isValidDonationReference(ref: string): boolean {
  if (!ref || typeof ref !== 'string') return false;
  const regex = new RegExp(`^${DONATION_CONFIG.REFERENCE_PREFIX}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$`);
  return regex.test(ref);
}
