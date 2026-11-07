/**
 * Pawfect Core Business Rules & Contract Unit Tests
 * Uses Node's built-in test runner: node:test & node:assert/strict
 * Run with: npx --yes tsx --test tests/rules.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail } from '../src/security/hash.js';
import {
  validatePasswordStrength,
  TOP_100_COMMON_PASSWORDS,
} from '../src/security/passwordRules.js';
import {
  sanitizeRedirectPath,
  emailSchema,
  phoneSchema,
} from '../src/security/validation.js';
import {
  ThrottleService,
} from '../src/services/ThrottleService.js';
import {
  TestClock,
  SimpleTestHasher,
  InMemoryThrottleStore,
  InMemoryUserProfileRepository,
} from '../src/repositories/InMemoryTestDoubles.js';
import { ROUTES } from '../src/config/constants.js';

// -----------------------------------------------------------------------------
// 1. EMAIL NORMALIZATION TESTS
// -----------------------------------------------------------------------------
test('Email normalization handles NFKC, trimming, lowercase and length bounds', () => {
  assert.equal(
    normalizeEmail('   Donor.Test@Example.COM  '),
    'donor.test@example.com'
  );

  // Unicode NFKC compatibility normalization
  const fullWidthEmail = 'ｔｅｓｔ@example.com';
  assert.equal(normalizeEmail(fullWidthEmail), 'test@example.com');

  // Max 254 length constraint
  const longString = 'a'.repeat(300) + '@example.com';
  assert.equal(normalizeEmail(longString).length, 254);
});

// -----------------------------------------------------------------------------
// 2. PASSWORD VALIDATION & BLOCKLIST TESTS
// -----------------------------------------------------------------------------
test('Password validation enforces min 10 chars, letter, and number', () => {
  const short = validatePasswordStrength('short1');
  assert.equal(short.isValid, false);
  assert.ok(short.errors.some((e) => e.includes('at least 10 characters')));

  const noNumber = validatePasswordStrength('alllettershere');
  assert.equal(noNumber.isValid, false);
  assert.ok(noNumber.errors.some((e) => e.includes('at least one number')));

  const noLetter = validatePasswordStrength('123456789012');
  assert.equal(noLetter.isValid, false);
  assert.ok(noLetter.errors.some((e) => e.includes('at least one letter')));
});

test('Password validation blocks top 100 common passwords', () => {
  assert.ok(TOP_100_COMMON_PASSWORDS.has('password123'));
  const common = validatePasswordStrength('password123');
  assert.equal(common.isValid, false);
  assert.ok(common.errors.some((e) => e.includes('too common')));
});

test('Password validation forbids email localpart in password', () => {
  const emailMatch = validatePasswordStrength('AnanyaPass2026!', 'ananya@pawfect.org');
  assert.equal(emailMatch.isValid, false);
  assert.ok(emailMatch.errors.some((e) => e.includes('must not contain your email username')));
});

test('Strong valid password passes cleanly', () => {
  const valid = validatePasswordStrength('K9ShelterRescue#2026', 'random@example.com');
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);
  assert.ok(valid.score >= 3);
});

// -----------------------------------------------------------------------------
// 3. REDIRECT SANITIZATION & OPEN REDIRECT GUARDS
// -----------------------------------------------------------------------------
test('sanitizeRedirectPath enforces strict allowlist and blocks open redirects', () => {
  // Allowed internal path
  assert.equal(sanitizeRedirectPath('/dashboard'), ROUTES.DASHBOARD);

  // External URL attempts
  assert.equal(sanitizeRedirectPath('https://evil-phishing.com'), ROUTES.DASHBOARD);
  assert.equal(sanitizeRedirectPath('//evil-phishing.com'), ROUTES.DASHBOARD);
  assert.equal(sanitizeRedirectPath('/\\evil-phishing.com'), ROUTES.DASHBOARD);
  assert.equal(sanitizeRedirectPath('javascript:alert(1)'), ROUTES.DASHBOARD);

  // Unlisted internal paths fallback to /dashboard
  assert.equal(sanitizeRedirectPath('/unknown/secret/path'), ROUTES.DASHBOARD);
  assert.equal(sanitizeRedirectPath(null), ROUTES.DASHBOARD);
});

// -----------------------------------------------------------------------------
// 4. PHONE VALIDATION (+91 10 DIGITS STARTING 6-9)
// -----------------------------------------------------------------------------
test('Phone validation normalizes and validates Indian numbers', () => {
  assert.equal(phoneSchema.parse('+919876543210'), '+919876543210');
  assert.equal(phoneSchema.parse('9876543210'), '+919876543210');

  // Invalid: starts with 5
  assert.throws(() => phoneSchema.parse('+915876543210'));
  // Invalid: too short
  assert.throws(() => phoneSchema.parse('987654321'));
});

// -----------------------------------------------------------------------------
// 5. THROTTLE SERVICE CONTRACT & 3-TRIES-PER-DAY LOGIC
// -----------------------------------------------------------------------------
test('ThrottleService allows 3 attempts, locks 4th attempt, and resets after 24h', async () => {
  const clock = new TestClock(new Date('2026-11-06T12:00:00Z'));
  const hasher = new SimpleTestHasher();
  const store = new InMemoryThrottleStore(clock);
  const throttle = new ThrottleService(store, hasher, clock);

  const email = 'donor@pawfect.org';

  // 1st attempt
  const attempt1 = await throttle.recordAttemptBeforeSignIn(email);
  assert.equal(attempt1.status, 'ALLOWED');
  assert.equal(attempt1.currentCount, 1);
  assert.equal(attempt1.remainingTries, 2);

  // 2nd attempt
  const attempt2 = await throttle.recordAttemptBeforeSignIn(email);
  assert.equal(attempt2.status, 'ALLOWED');
  assert.equal(attempt2.currentCount, 2);
  assert.equal(attempt2.remainingTries, 1);

  // 3rd attempt (last try)
  const attempt3 = await throttle.recordAttemptBeforeSignIn(email);
  assert.equal(attempt3.status, 'ALLOWED');
  assert.equal(attempt3.currentCount, 3);
  assert.equal(attempt3.remainingTries, 0);
  assert.ok(attempt3.message?.includes('That was your last try today'));

  // 4th attempt: MUST be LOCKED without calling downstream auth
  const attempt4 = await throttle.recordAttemptBeforeSignIn(email);
  assert.equal(attempt4.status, 'LOCKED');
  assert.equal(attempt4.isLocked, true);
  assert.ok(attempt4.message?.includes('Too many tries today'));
  assert.ok(attempt4.unlockTimeFormatted !== undefined);

  // Advance time by 24 hours: window resets back to 1 attempt allowed
  clock.advanceHours(24);
  const attemptAfter24h = await throttle.recordAttemptBeforeSignIn(email);
  assert.equal(attemptAfter24h.status, 'ALLOWED');
  assert.equal(attemptAfter24h.currentCount, 1);
  assert.equal(attemptAfter24h.remainingTries, 2);
});

test('ThrottleService rapid consecutive attempts count reliably', async () => {
  const clock = new TestClock();
  const hasher = new SimpleTestHasher();
  const store = new InMemoryThrottleStore(clock);
  const throttle = new ThrottleService(store, hasher, clock);

  const email = 'parallel@pawfect.org';

  // Perform 3 calls
  await throttle.recordAttemptBeforeSignIn(email);
  await throttle.recordAttemptBeforeSignIn(email);
  const result = await throttle.recordAttemptBeforeSignIn(email);

  assert.equal(result.currentCount, 3);
  assert.equal(result.remainingTries, 0);
});

// -----------------------------------------------------------------------------
// 6. REPOSITORY CONTRACT TESTS (USER PROFILE & IMMUTABILITY)
// -----------------------------------------------------------------------------
test('UserProfileRepository preserves DONOR role and immutability', async () => {
  const repo = new InMemoryUserProfileRepository();
  const profile = {
    uid: 'donor_uid_123',
    fullName: 'Sita Raman',
    phone: '+919876543210',
    consentAt: new Date().toISOString(),
    consentVersion: 'v1.0',
    role: 'DONOR' as const,
    createdAt: new Date().toISOString(),
  };

  await repo.createProfile(profile);
  const retrieved = await repo.getProfile('donor_uid_123');
  assert.ok(retrieved);
  assert.equal(retrieved.fullName, 'Sita Raman');
  assert.equal(retrieved.role, 'DONOR');

  // Updating name
  await repo.updateProfile('donor_uid_123', { fullName: 'Sita R. Sharma' });
  const updated = await repo.getProfile('donor_uid_123');
  assert.equal(updated?.fullName, 'Sita R. Sharma');
  assert.equal(updated?.role, 'DONOR'); // Role immutable
});
