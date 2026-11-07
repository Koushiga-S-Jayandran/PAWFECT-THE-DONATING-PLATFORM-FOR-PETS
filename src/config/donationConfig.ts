/**
 * Global Donation Configuration & Limits (Single Source of Truth)
 */

export const DONATION_CONFIG = {
  // Expiry window: A donation expires if not completed in 30 minutes
  EXPIRY_WINDOW_MINUTES: 30,
  EXPIRY_WINDOW_MS: 30 * 60 * 1000,

  // Custom Amount limits in Paise (1 INR = 100 Paise)
  MIN_CUSTOM_AMOUNT_PAISE: 50 * 100, // ₹50
  MAX_CUSTOM_AMOUNT_PAISE: 100000 * 100, // ₹1,00,000

  // Reference Format
  REFERENCE_PREFIX: 'PWF',
  REFERENCE_LENGTH: 12,

  // Currency
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',

  // Platform Fee
  PLATFORM_FEE_PERCENTAGE: 0, // 0% Spark free plan

  // Supported Payment Modes
  PAYMENT_MODE: 'UPI' as const,

  // Status values
  ALLOWED_STATUSES: ['PENDING', 'CANCELLED', 'EXPIRED'] as const,
  RESERVED_STATUSES: ['CONFIRMED', 'REFUNDED'] as const, // Reserved for Part B settlement
} as const;

export type DonationStatus =
  | (typeof DONATION_CONFIG.ALLOWED_STATUSES)[number]
  | (typeof DONATION_CONFIG.RESERVED_STATUSES)[number];
