/**
 * Unit Tests for "List an Animal for Adoption" Module & Existing Adoption Regression Fixes
 * Uses Node's built-in test runner: node:test & node:assert/strict
 * Run with: npx --yes tsx --test tests/adoptionListing.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  containsLinkOrSpam,
  normalizeIndianMobile,
  isValidIndianMobile,
  stepAnimalSchema,
  stepHealthNatureSchema,
  stepPhotosSchema,
  stepStorySchema,
  stepLocationSchema,
  stepContactSchema,
  interestRequestSchema,
  reportListingSchema,
  computeListingFingerprint,
} from '../src/security/adoptionListingValidation.js';
import {
  canAdminModerateListing,
  resolveStatusAfterListerEdit,
  canListerChangeStatus,
  evaluateListingInactivity,
  checkDailyRateLimit,
  canRevealListerPhone,
} from '../src/domain/listingLifecycle.js';
import { LISTING_STATUS } from '../src/config/adoptionListingConfig.js';
import { isStateCodeEnabled, isValidDistrictForState } from '../src/config/regions.js';
import { sanitizeRedirectPath } from '../src/security/validation.js';
import { ROUTES } from '../src/config/constants.js';
import {
  CLOUDINARY_CLOUD_NAME as STORAGE_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET as STORAGE_UPLOAD_PRESET,
  CLOUDINARY_UPLOAD_URL as STORAGE_UPLOAD_URL,
} from '../src/config/storageConfig.js';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_UPLOAD_URL,
  uploadBlobToCloudinary,
} from '../src/services/AdoptionPhotoUploadService.js';

test('Anti-Abuse: Link, script, and spam blocker rejects URLs & repeated characters', () => {
  assert.ok(containsLinkOrSpam('Call me on https://example.com/dog'));
  assert.ok(containsLinkOrSpam('Visit www.puppyfarm.in for prices'));
  assert.ok(containsLinkOrSpam('<script>alert(1)</script>'));
  assert.ok(containsLinkOrSpam('wa.me/919876543210'));
  assert.ok(containsLinkOrSpam('aaaaaaaaaaaaaaaaaaaa'));
  assert.equal(containsLinkOrSpam('Friendly rescued pup vaccinated in Chennai.'), null);
});

test('Phone Validation: Normalizes and verifies 10-digit Indian mobile numbers', () => {
  assert.equal(normalizeIndianMobile('98765 43210'), '+919876543210');
  assert.equal(normalizeIndianMobile('919876543210'), '+919876543210');
  assert.equal(isValidIndianMobile('9876543210'), true);
  assert.equal(isValidIndianMobile('+919876543210'), true);

  // Starts with 5 or too short
  assert.equal(isValidIndianMobile('5876543210'), false);
  assert.equal(isValidIndianMobile('98765432'), false);
});

test('Regional Config: Only Tamil Nadu (TN) and Kerala (KL) enabled at launch', () => {
  assert.equal(isStateCodeEnabled('TN'), true);
  assert.equal(isStateCodeEnabled('KL'), true);
  assert.equal(isStateCodeEnabled('KA'), false);
  assert.equal(isStateCodeEnabled('MH'), false);

  assert.equal(isValidDistrictForState('TN', 'Coimbatore'), true);
  assert.equal(isValidDistrictForState('KL', 'Ernakulam'), true);
  assert.equal(isValidDistrictForState('TN', 'Ernakulam'), false);

  assert.throws(() =>
    stepLocationSchema.parse({
      stateCode: 'KA',
      district: 'Bengaluru',
      city: 'Bengaluru',
    })
  );

  const validKL = stepLocationSchema.parse({
    stateCode: 'KL',
    district: 'Kozhikode',
    city: 'Kozhikode',
  });
  assert.equal(validKL.stateCode, 'KL');
});

test('Step Validation: Handles Unnamed animal, 0-month newborn, photo limits, story bounds, and OTP guard', () => {
  // 0-month newborn + Unnamed passes cleanly (regression fix for falsy 0 bug)
  const animal = stepAnimalSchema.parse({
    listerType: 'individual',
    isUnnamed: true,
    name: '',
    species: 'dog',
    breed: 'Indie Pup',
    ageMonths: 0,
    gender: 'female',
    size: 'small',
    color: 'Golden Brown',
  });
  assert.equal(animal.ageMonths, 0);
  assert.equal(animal.isUnnamed, true);

  // Photos: 0 photos rejected, 6 photos rejected, 1-5 accepted
  assert.throws(() => stepPhotosSchema.parse({ photos: [] }));
  assert.throws(() =>
    stepPhotosSchema.parse({
      photos: Array.from({ length: 6 }, (_, i) => `https://res.cloudinary.com/demo/image/upload/p${i}.jpg`),
    })
  );
  const photosOk = stepPhotosSchema.parse({
    photos: ['https://res.cloudinary.com/demo/image/upload/dog.jpg'],
  });
  assert.equal(photosOk.photos.length, 1);

  // Non-Cloudinary untrusted URL rejected
  assert.throws(() =>
    stepPhotosSchema.parse({
      photos: ['https://evil.example.com/dog.jpg'],
    })
  );

  // Story under 30 chars or containing URL rejected
  assert.throws(() => stepStorySchema.parse({ story: 'Needs home fast.' }));
  assert.throws(() =>
    stepStorySchema.parse({
      story: 'Cute dog needs a home check https://spam.in right now please.',
    })
  );
  const storyOk = stepStorySchema.parse({
    story: 'Found near Marina beach after heavy rains. Very gentle with children and house-trained.',
  });
  assert.ok(storyOk.story.length >= 30);

  // Contact requires phoneVerified === true
  assert.throws(() =>
    stepContactSchema.parse({
      contactName: 'Priya Menon',
      phone: '9876543210',
      revealOnlyToApproved: true,
      phoneVerified: false,
    })
  );

  // Health & nature enforces at least 1 temperament tag
  assert.throws(() =>
    stepHealthNatureSchema.parse({
      vaccinated: true,
      sterilised: false,
      injuriesOrConditions: '',
      temperament: [],
      goodWithKids: 'yes',
      goodWithOtherPets: 'unknown',
    })
  );
});

test('Adopter Inquiry & Safety Report Validation: Enforces 4-field inquiry and blocks spam', () => {
  const validInterest = interestRequestSchema.parse({
    name: 'Arjun Nair',
    housingType: 'own_house',
    experience: 'Raised two Indie dogs in Kochi for 8 years',
    reason: 'We have a secure fenced garden and work from home so she will always have company.',
  });
  assert.equal(validInterest.name, 'Arjun Nair');

  assert.throws(() =>
    interestRequestSchema.parse({
      name: 'Arjun Nair',
      housingType: 'own_house',
      experience: 'First time',
      reason: 'Too short',
    })
  );

  assert.throws(() =>
    reportListingSchema.parse({
      reason: 'suspected_sale',
      details: 'Asking Rs 5000 upfront check https://scam.com',
    })
  );
});

test('Duplicate Fingerprint: Deterministic SHA-256 blocks duplicate active listings', async () => {
  const h1 = await computeListingFingerprint({
    listerUid: 'user_1',
    species: 'dog',
    name: '  Milo ',
    breed: 'Indie',
    gender: 'male',
    ageMonths: 8,
    stateCode: 'TN',
    district: 'Chennai',
  });
  const h2 = await computeListingFingerprint({
    listerUid: 'user_1',
    species: 'DOG',
    name: 'milo',
    breed: 'indie',
    gender: 'male',
    ageMonths: 8,
    stateCode: 'tn',
    district: 'chennai',
  });
  const h3 = await computeListingFingerprint({
    listerUid: 'user_1',
    species: 'dog',
    name: 'Milo',
    breed: 'Indie',
    gender: 'male',
    ageMonths: 9,
    stateCode: 'TN',
    district: 'Chennai',
  });

  assert.equal(h1.length, 64);
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test('Lifecycle & Re-approval: Editing an approved listing resets status back to pending', () => {
  assert.equal(resolveStatusAfterListerEdit(LISTING_STATUS.APPROVED), LISTING_STATUS.PENDING);
  assert.equal(
    resolveStatusAfterListerEdit(LISTING_STATUS.CHANGES_REQUESTED),
    LISTING_STATUS.PENDING
  );
  assert.equal(resolveStatusAfterListerEdit(LISTING_STATUS.REJECTED), LISTING_STATUS.PENDING);
  assert.equal(
    resolveStatusAfterListerEdit(LISTING_STATUS.EXPIRED_HIDDEN),
    LISTING_STATUS.PENDING
  );
  assert.equal(resolveStatusAfterListerEdit(LISTING_STATUS.ON_HOLD), LISTING_STATUS.ON_HOLD);
});

test('Admin Moderation Guard: Blocks non-admins, self-approval, and missing rejection reason', () => {
  // Non-admin blocked
  assert.equal(
    canAdminModerateListing({
      isAdmin: false,
      adminUid: 'u2',
      listerUid: 'u1',
      fromStatus: LISTING_STATUS.PENDING,
      decision: LISTING_STATUS.APPROVED,
    }).allowed,
    false
  );

  // Admin cannot approve own listing
  assert.equal(
    canAdminModerateListing({
      isAdmin: true,
      adminUid: 'u1',
      listerUid: 'u1',
      fromStatus: LISTING_STATUS.PENDING,
      decision: LISTING_STATUS.APPROVED,
    }).allowed,
    false
  );

  // Rejection requires reason >= 10 chars
  assert.equal(
    canAdminModerateListing({
      isAdmin: true,
      adminUid: 'admin_1',
      listerUid: 'u1',
      fromStatus: LISTING_STATUS.PENDING,
      decision: LISTING_STATUS.REJECTED,
      reason: 'bad',
    }).allowed,
    false
  );

  // Valid admin approval
  assert.equal(
    canAdminModerateListing({
      isAdmin: true,
      adminUid: 'admin_1',
      listerUid: 'u1',
      fromStatus: LISTING_STATUS.PENDING,
      decision: LISTING_STATUS.APPROVED,
    }).allowed,
    true
  );
});

test('Lister Status Transitions: Enforces On Hold, Resume, and Adopted rules', () => {
  assert.equal(
    canListerChangeStatus({ fromStatus: LISTING_STATUS.APPROVED, toStatus: LISTING_STATUS.ON_HOLD })
      .allowed,
    true
  );
  assert.equal(
    canListerChangeStatus({ fromStatus: LISTING_STATUS.ON_HOLD, toStatus: LISTING_STATUS.APPROVED })
      .allowed,
    true
  );
  assert.equal(
    canListerChangeStatus({ fromStatus: LISTING_STATUS.APPROVED, toStatus: LISTING_STATUS.ADOPTED })
      .allowed,
    true
  );
  // Pending listing cannot be self-promoted to approved by lister
  assert.equal(
    canListerChangeStatus({ fromStatus: LISTING_STATUS.PENDING, toStatus: LISTING_STATUS.APPROVED })
      .allowed,
    false
  );
});

test('60-Day Inactivity Evaluation: Sends reminder at day 50 and auto-hides at day 60', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const baseMs = new Date('2026-01-01T00:00:00Z').getTime();

  const day49 = evaluateListingInactivity(
    { status: LISTING_STATUS.APPROVED, lastActivityAt: new Date(baseMs).toISOString() },
    baseMs + 49 * dayMs
  );
  assert.equal(day49.needsReminder, false);
  assert.equal(day49.shouldAutoHide, false);

  const day50 = evaluateListingInactivity(
    { status: LISTING_STATUS.APPROVED, lastActivityAt: new Date(baseMs).toISOString() },
    baseMs + 50 * dayMs
  );
  assert.equal(day50.needsReminder, true);
  assert.equal(day50.shouldAutoHide, false);
  assert.equal(day50.daysUntilAutoHide, 10);

  const day50AlreadySent = evaluateListingInactivity(
    {
      status: LISTING_STATUS.APPROVED,
      lastActivityAt: new Date(baseMs).toISOString(),
      inactivityReminderSentAt: new Date(baseMs + 50 * dayMs).toISOString(),
    },
    baseMs + 55 * dayMs
  );
  assert.equal(day50AlreadySent.needsReminder, false);
  assert.equal(day50AlreadySent.shouldAutoHide, false);

  const day60 = evaluateListingInactivity(
    { status: LISTING_STATUS.APPROVED, lastActivityAt: new Date(baseMs).toISOString() },
    baseMs + 60 * dayMs
  );
  assert.equal(day60.shouldAutoHide, true);
  assert.equal(day60.needsReminder, false);
});

test('Daily Rate Limit: Allows 3 listings/day, blocks 4th, resets next UTC day', () => {
  const today = '2026-11-14';
  const r1 = checkDailyRateLimit({ storedDateKey: '', storedCount: 0, todayDateKey: today });
  assert.deepEqual(r1, { allowed: true, nextCount: 1, remaining: 2 });

  const r3 = checkDailyRateLimit({ storedDateKey: today, storedCount: 2, todayDateKey: today });
  assert.deepEqual(r3, { allowed: true, nextCount: 3, remaining: 0 });

  const r4 = checkDailyRateLimit({ storedDateKey: today, storedCount: 3, todayDateKey: today });
  assert.equal(r4.allowed, false);

  const nextDay = checkDailyRateLimit({
    storedDateKey: today,
    storedCount: 3,
    todayDateKey: '2026-11-15',
  });
  assert.deepEqual(nextDay, { allowed: true, nextCount: 1, remaining: 2 });
});

test('Private Phone Reveal Guard: Reveals phone ONLY to owner, admin, or accepted adopter', () => {
  assert.equal(
    canRevealListerPhone({ viewerUid: null, listerUid: 'lister_1', adopterRequestStatus: null }),
    false
  );
  assert.equal(
    canRevealListerPhone({
      viewerUid: 'adopter_1',
      listerUid: 'lister_1',
      adopterRequestStatus: 'pending',
    }),
    false
  );
  assert.equal(
    canRevealListerPhone({
      viewerUid: 'adopter_1',
      listerUid: 'lister_1',
      adopterRequestStatus: 'rejected',
    }),
    false
  );
  assert.equal(
    canRevealListerPhone({
      viewerUid: 'adopter_1',
      listerUid: 'lister_1',
      adopterRequestStatus: 'approved',
    }),
    true
  );
  assert.equal(
    canRevealListerPhone({ viewerUid: 'lister_1', listerUid: 'lister_1', adopterRequestStatus: null }),
    true
  );
  assert.equal(
    canRevealListerPhone({
      viewerUid: 'admin_1',
      listerUid: 'lister_1',
      isAdmin: true,
      adopterRequestStatus: null,
    }),
    true
  );
});

test('Guest Redirect Support: /pets/list passes sanitizeRedirectPath cleanly', () => {
  assert.equal(sanitizeRedirectPath(ROUTES.LIST_ANIMAL), ROUTES.LIST_ANIMAL);
  assert.equal(sanitizeRedirectPath(ROUTES.MY_LISTINGS), ROUTES.MY_LISTINGS);
  assert.equal(sanitizeRedirectPath(ROUTES.ADMIN_ADOPTIONS), ROUTES.ADMIN_ADOPTIONS);
});

test('Cloudinary Unsigned Upload: Uses hzhohdqe + pawfect_unsigned and sends only file and upload_preset', async () => {
  assert.equal(CLOUDINARY_CLOUD_NAME, 'hzhohdqe');
  assert.equal(CLOUDINARY_UPLOAD_PRESET, 'pawfect_unsigned');
  assert.equal(
    CLOUDINARY_UPLOAD_URL,
    'https://api.cloudinary.com/v1_1/hzhohdqe/image/upload'
  );
  assert.equal(STORAGE_CLOUD_NAME, 'hzhohdqe');
  assert.equal(STORAGE_UPLOAD_PRESET, 'pawfect_unsigned');
  assert.equal(
    STORAGE_UPLOAD_URL,
    'https://api.cloudinary.com/v1_1/hzhohdqe/image/upload'
  );

  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedKeys: string[] = [];
  let capturedPreset: FormDataEntryValue | null = null;

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      const body = init?.body as FormData;
      capturedKeys = Array.from(body.keys()).sort();
      capturedPreset = body.get('upload_preset');
      return new Response(
        JSON.stringify({
          secure_url: 'https://res.cloudinary.com/hzhohdqe/image/upload/v1/sample.jpg',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const url = await uploadBlobToCloudinary(new Blob(['img'], { type: 'image/jpeg' }), 'pet.jpg');
    assert.equal(capturedUrl, 'https://api.cloudinary.com/v1_1/hzhohdqe/image/upload');
    assert.deepEqual(capturedKeys, ['file', 'upload_preset']);
    assert.equal(capturedPreset, 'pawfect_unsigned');
    assert.equal(url, 'https://res.cloudinary.com/hzhohdqe/image/upload/v1/sample.jpg');

    // Verify real Cloudinary JSON error message surfaces clearly
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'File size too large. Got 12MB.' } }), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    await assert.rejects(
      uploadBlobToCloudinary(new Blob(['img'], { type: 'image/jpeg' }), 'pet.jpg'),
      /Upload failed: File size too large\. Got 12MB\./
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
