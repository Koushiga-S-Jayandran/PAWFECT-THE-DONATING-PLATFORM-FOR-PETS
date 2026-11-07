/**
 * Route paths for Donation and Gift Giving Subsystem
 */

export const DONATION_ROUTES = {
  CATALOG: '/gifts',
  DETAILS: '/donate/:giftId',
  REVIEW: '/donate/review',
  PAY: '/donate/pay/:id',
  STATUS: '/donate/status/:id',
  MY_DONATIONS: '/my-donations',
} as const;
