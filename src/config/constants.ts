/**
 * Pawfect Configuration Constants
 * Strict type safety and zero hardcoded business magic numbers.
 */

// Gifts start at just ₹50 (5000 paise stored in configuration, formatted at display)
export const MIN_GIFT_PAISE = 5000;

export const APP_CONFIG = {
  appName: 'Pawfect',
  tagline: 'Connecting every paw to its perfect hands',
  heroHeadline: 'Be the umbrella a shelter animal needs.',
  heroSubhead:
    'Give meals, vaccinations or a sponsorship to verified shelters across India. Pay the shelter directly by UPI and get photo proof.',
  timezone: 'Asia/Kolkata',
  supportEmail: 'support@pawfect.org.in',
  consentVersion: 'v1.0',
  maxPasswordAttempts: 3,
  lockoutHours: 24,
  verificationCooldownSeconds: 60,
  maxVerificationPerHour: 3,
  maxResetPerHour: 3,
} as const;

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  RESET: '/reset',
  DASHBOARD: '/dashboard',
} as const;

export const ALLOWED_REDIRECT_PATHS: readonly string[] = [
  ROUTES.DASHBOARD,
  ROUTES.HOME,
];

export function formatPaiseToRupees(paise: number): string {
  const rupees = Math.floor(paise / 100);
  return `₹${rupees}`;
}
