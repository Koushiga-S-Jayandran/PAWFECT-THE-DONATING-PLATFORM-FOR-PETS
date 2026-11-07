import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GIFT_CATALOG,
  getAllGifts,
  getGiftById,
  isValidGiftId,
} from '../src/config/giftCatalog.js';
import {
  paiseToRupees,
  rupeesToPaise,
  formatRupees,
  calculateGiftTotalPaise,
} from '../src/utils/money.js';
import {
  generateDonationReference,
  isValidDonationReference,
} from '../src/utils/referenceGenerator.js';
import {
  calculateExpiryTimestamp,
  isDonationExpired,
  getRemainingSeconds,
  formatRemainingTime,
} from '../src/utils/dateUtils.js';
import { buildUpiLink, parseUpiLink } from '../src/security/upiLink.js';
import {
  canTransitionDonation,
  assertLegalDonationTransition,
} from '../src/state-machines/donationStateMachine.js';
import {
  DonationStateError,
  DonationValidationError,
  DuplicateReferenceError,
} from '../src/domain/donationErrors.js';
import { InMemoryDonationRepository } from '../src/repositories/InMemoryDonationRepository.js';
import type { Donation, DonationAuditEntry } from '../src/domain/donationEntities.js';

test('Gift Catalog: Complete 14 gifts verification', () => {
  const gifts = getAllGifts();
  assert.equal(gifts.length, 14, 'Catalog must contain exactly 14 gifts');

  const requiredIds = [
    'one-meal',
    'family-meal-pack',
    'fresh-water-bowls',
    'vaccination',
    'deworming-tick-care',
    'sterilisation-support',
    'emergency-treatment',
    'reflective-collar',
    'sponsor-month',
    'sponsor-year',
    'birthday-gift',
    'anniversary-gift',
    'in-memory-of',
    'custom-amount',
  ];

  for (const id of requiredIds) {
    assert.equal(isValidGiftId(id), true, `Gift '${id}' must be in catalog`);
    const item = getGiftById(id);
    assert.ok(item, `Item '${id}' must exist`);
    assert.ok(item.name.length > 2, `Name for '${id}' must be non-empty`);
    assert.ok(item.caption.length > 5, `Caption for '${id}' must be non-empty`);
    assert.ok(item.imagePath.startsWith('/images/gifts/'), `Image path for '${id}' must point to /images/gifts/`);
    assert.ok(item.imagePath.endsWith('.webp'), `Image for '${id}' must be WebP format`);
    assert.ok(item.imageAlt.length > 10, `Alt text for '${id}' must be descriptive`);
    assert.ok(Number.isInteger(item.unitPricePaise), `Unit price for '${id}' must be integer paise`);
  }
});

test('Money & Pricing: Integer Paise Calculations', () => {
  assert.equal(paiseToRupees(5000), 50);
  assert.equal(rupeesToPaise(50), 5000);
  assert.equal(formatRupees(5000), '₹50');
  assert.equal(formatRupees(250000), '₹2,500');

  // One meal (₹50) x 3 = ₹150 (15000 paise)
  const calc1 = calculateGiftTotalPaise({
    giftId: 'one-meal',
    quantity: 3,
  });
  assert.equal(calc1.unitPricePaise, 5000);
  assert.equal(calc1.totalAmountPaise, 15000);

  // Custom amount validation
  const customValid = calculateGiftTotalPaise({
    giftId: 'custom-amount',
    quantity: 1,
    customAmountRupees: 750,
  });
  assert.equal(customValid.totalAmountPaise, 75000);

  // Custom amount below ₹50 throws
  assert.throws(
    () =>
      calculateGiftTotalPaise({
        giftId: 'custom-amount',
        quantity: 1,
        customAmountRupees: 20,
      }),
    DonationValidationError
  );

  // Invalid quantity throws
  assert.throws(
    () =>
      calculateGiftTotalPaise({
        giftId: 'one-meal',
        quantity: 0,
      }),
    DonationValidationError
  );
});

test('Reference Generator: Format and Unambiguity', () => {
  for (let i = 0; i < 20; i++) {
    const ref = generateDonationReference();
    assert.equal(ref.startsWith('PWF-'), true);
    assert.equal(ref.length, 12);
    assert.equal(isValidDonationReference(ref), true);
    // Never contains ambiguous letters 0, O, 1, I, L
    assert.equal(/[0O1IL]/.test(ref), false, `Reference '${ref}' contains ambiguous characters`);
  }
});

test('UPI Deep Link Generator: NPCI compliance', () => {
  const uri = buildUpiLink({
    upiId: 'shelter@okaxis',
    payeeName: 'Karuna Foundation',
    amountPaise: 25000, // ₹250
    reference: 'PWF-ABCDEF12',
    note: 'Family Meal Pack',
  });

  assert.ok(uri.startsWith('upi://pay?'), 'Must start with upi://pay?');
  const params = parseUpiLink(uri);
  assert.equal(params.pa, 'shelter@okaxis');
  assert.equal(params.pn, 'Karuna Foundation');
  assert.equal(params.am, '250.00');
  assert.equal(params.cu, 'INR');
  assert.equal(params.tr, 'PWF-ABCDEF12');
});

test('Donation State Machine: Step 1 Allowed and Blocked Transitions', () => {
  // Enabled in Step 1
  assert.equal(canTransitionDonation('PENDING', 'CANCELLED', 'DONOR'), true);
  assert.equal(canTransitionDonation('PENDING', 'EXPIRED', 'SYSTEM'), true);
  assert.equal(canTransitionDonation('PENDING', 'EXPIRED', 'DONOR'), true);

  // Blocked / Reserved for Part B
  assert.equal(canTransitionDonation('PENDING', 'CONFIRMED', 'SYSTEM'), false);
  assert.equal(canTransitionDonation('CONFIRMED', 'REFUNDED', 'ADMIN'), false);

  // Illegal transitions
  assert.equal(canTransitionDonation('CANCELLED', 'PENDING'), false);
  assert.equal(canTransitionDonation('EXPIRED', 'PENDING'), false);

  // Donor cannot cancel someone else's donation
  assert.throws(() => {
    assertLegalDonationTransition({
      fromStatus: 'PENDING',
      toStatus: 'CANCELLED',
      actorType: 'DONOR',
      actorUid: 'donor_attacker',
      donorUid: 'donor_owner',
    });
  }, DonationStateError);

  // Step 1 blocks CONFIRMED transition
  assert.throws(() => {
    assertLegalDonationTransition({
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      actorType: 'SYSTEM',
      actorUid: 'system',
      donorUid: 'donor_1',
    });
  }, DonationStateError);
});

test('Date and TTL: 30-minute expiry calculations', () => {
  const now = Date.now();
  const expiry = calculateExpiryTimestamp(now);
  assert.equal(expiry - now, 30 * 60 * 1000);

  // Future expiry is not expired
  assert.equal(isDonationExpired(now + 60000), false);
  // Past expiry is expired
  assert.equal(isDonationExpired(now - 1000), true);

  assert.equal(formatRemainingTime(125), '02:05');
  assert.equal(formatRemainingTime(0), '00:00');
});

test('Repository Contract: Atomic persistence and version concurrency', async () => {
  const repo = new InMemoryDonationRepository();

  const donation: Donation = {
    id: 'test_don_1',
    reference: 'PWF-TEST1234',
    donorUid: 'donor_user_1',
    donorName: 'Test Donor',
    donorEmail: 'donor@test.com',
    shelterId: 'shelter_1',
    shelterName: 'Karuna Shelter',
    shelterState: 'TN',
    shelterDistrict: 'Chennai',
    shelterUpiId: 'karuna@upi',
    shelterPayeeName: 'Karuna Shelter',
    giftId: 'one-meal',
    giftName: 'One Wholesome Meal',
    quantity: 2,
    unitPricePaise: 5000,
    amountPaise: 10000,
    status: 'PENDING',
    statusVersion: 1,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1800000,
    updatedAt: Date.now(),
    upiIntentUrl: 'upi://pay?pa=karuna@upi',
  };

  const audit: DonationAuditEntry = {
    donationId: donation.id,
    reference: donation.reference,
    fromStatus: 'PENDING',
    toStatus: 'PENDING',
    actorUid: 'donor_user_1',
    actorType: 'DONOR',
    timestamp: Date.now(),
  };

  await repo.createDonation({ donation, audit });

  // Retrieval
  const fetched = await repo.getDonationById('test_don_1');
  assert.ok(fetched);
  assert.equal(fetched.reference, 'PWF-TEST1234');

  // Duplicate reference creation fails
  await assert.rejects(
    () => repo.createDonation({ donation: { ...donation, id: 'test_don_2' }, audit }),
    DuplicateReferenceError
  );

  // Update status with valid version
  const updated = await repo.updateDonationStatus({
    donationId: 'test_don_1',
    expectedVersion: 1,
    newStatus: 'CANCELLED',
    reason: 'Test cancellation',
    audit: { ...audit, fromStatus: 'PENDING', toStatus: 'CANCELLED' },
  });

  assert.equal(updated.status, 'CANCELLED');
  assert.equal(updated.statusVersion, 2);

  // Stale version update fails
  await assert.rejects(
    () =>
      repo.updateDonationStatus({
        donationId: 'test_don_1',
        expectedVersion: 1, // Current is 2
        newStatus: 'EXPIRED',
        audit,
      })
  );
});
