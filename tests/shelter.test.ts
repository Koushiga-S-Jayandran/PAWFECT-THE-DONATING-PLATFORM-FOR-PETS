import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REGIONS,
  isStateEnabled,
  isValidDistrictForState,
  getEnabledStates,
  getDistrictsForState,
} from '../src/config/regions.js';
import {
  assertCanModerate,
  assertLegalTransition,
  assertVersionMatch,
  canTransition,
  isReasonRequired,
  MAX_RESUBMISSIONS,
} from '../src/state-machines/shelterStateMachine.js';
import {
  IllegalTransitionError,
  NotAuthorizedError,
  StaleVersionError,
} from '../src/domain/shelterErrors.js';
import { sanitizeText, isSafeHttpsUrl } from '../src/security/textSanitizer.js';
import {
  shelterStep1Schema,
  shelterStep2Schema,
  shelterStep3Schema,
  moderationActionSchema,
} from '../src/security/shelterValidation.js';

test('Region Registry: Tamil Nadu and Kerala only', () => {
  const enabled = getEnabledStates();
  assert.deepEqual(enabled, ['TN', 'KL']);
  assert.equal(isStateEnabled('TN'), true);
  assert.equal(isStateEnabled('KL'), true);
  assert.equal(isStateEnabled('KA'), false);

  const tnDistricts = getDistrictsForState('TN');
  assert.equal(tnDistricts.length, 38, 'Tamil Nadu must have 38 districts');
  assert.equal(isValidDistrictForState('TN', 'Chennai'), true);
  assert.equal(isValidDistrictForState('TN', 'Coimbatore'), true);
  assert.equal(isValidDistrictForState('TN', 'Wayanad'), false);

  const klDistricts = getDistrictsForState('KL');
  assert.equal(klDistricts.length, 14, 'Kerala must have 14 districts');
  assert.equal(isValidDistrictForState('KL', 'Wayanad'), true);
  assert.equal(isValidDistrictForState('KL', 'Ernakulam'), true);
  assert.equal(isValidDistrictForState('KL', 'Chennai'), false);
});

test('State Machine: Valid and Invalid Transitions', () => {
  // Legal
  assert.equal(canTransition('PENDING', 'APPROVED'), true);
  assert.equal(canTransition('PENDING', 'REJECTED'), true);
  assert.equal(canTransition('APPROVED', 'SUSPENDED'), true);
  assert.equal(canTransition('APPROVED', 'REMOVED'), true);
  assert.equal(canTransition('SUSPENDED', 'APPROVED'), true);
  assert.equal(canTransition('SUSPENDED', 'REMOVED'), true);
  assert.equal(canTransition('REJECTED', 'REMOVED'), true);
  assert.equal(canTransition('REJECTED', 'PENDING', 'OWNER'), true);

  // Illegal
  assert.equal(canTransition('PENDING', 'SUSPENDED'), false);
  assert.equal(canTransition('APPROVED', 'PENDING'), false);
  assert.equal(canTransition('REJECTED', 'APPROVED'), false);
  assert.equal(canTransition('SUSPENDED', 'PENDING'), false);

  assert.throws(
    () => assertLegalTransition('PENDING', 'SUSPENDED'),
    IllegalTransitionError
  );
  assert.throws(
    () => assertLegalTransition('REJECTED', 'APPROVED'),
    IllegalTransitionError
  );
});

test('State Machine: Reason requirements', () => {
  assert.equal(isReasonRequired('REJECTED'), true);
  assert.equal(isReasonRequired('SUSPENDED'), true);
  assert.equal(isReasonRequired('REMOVED'), true);
  assert.equal(isReasonRequired('APPROVED'), false);
  assert.equal(isReasonRequired('PENDING'), false);

  // Reason missing or too short for REJECTED
  assert.throws(() => {
    assertLegalTransition('PENDING', 'REJECTED', { reason: 'Short' });
  });

  // Reason provided (10-300 chars) succeeds
  assert.doesNotThrow(() => {
    assertLegalTransition('PENDING', 'REJECTED', {
      reason: 'Registration document could not be verified with registrar.',
    });
  });
});

test('State Machine: Anti-self-approval guard', () => {
  const adminUid = 'user_abc_123';
  const otherShelterId = 'user_xyz_789';

  assert.doesNotThrow(() => {
    assertCanModerate(adminUid, otherShelterId);
  });

  assert.throws(() => {
    assertCanModerate(adminUid, adminUid);
  }, NotAuthorizedError);
});

test('State Machine: Concurrency version check', () => {
  assert.doesNotThrow(() => {
    assertVersionMatch(2, 2);
  });

  assert.throws(() => {
    assertVersionMatch(2, 1);
  }, StaleVersionError);
});

test('Text Sanitizer: XSS and whitespace stripping', () => {
  const dirty = '<script>alert("hack")</script>   Safe  Name  \u0000 ';
  const cleaned = sanitizeText(dirty);
  assert.equal(cleaned, 'scriptalert("hack")/script Safe Name');

  assert.equal(isSafeHttpsUrl('https://example.com/proof.pdf'), true);
  assert.equal(isSafeHttpsUrl('http://insecure.com/proof.pdf'), false);
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpsUrl(''), false);
});

test('Validation: Form Schemas (Step 1, Step 2, Step 3)', () => {
  // Valid step 1
  const step1 = shelterStep1Schema.safeParse({
    name: 'Karuna Animal Shelter',
    stateCode: 'TN',
    district: 'Chennai',
    area: 'Adyar',
    animalTypes: ['DOG', 'CAT'],
  });
  assert.equal(step1.success, true);

  // Invalid district for state
  const badDistrict = shelterStep1Schema.safeParse({
    name: 'Karuna Animal Shelter',
    stateCode: 'TN',
    district: 'Wayanad', // Wayanad is in KL, not TN
    area: 'Adyar',
    animalTypes: ['DOG'],
  });
  assert.equal(badDistrict.success, false);

  // Valid step 2
  const step2 = shelterStep2Schema.safeParse({
    contactPerson: 'Ravi Kumar',
    phone: '+919876543210',
    fullAddress: '12 Green Avenue, Adyar, Chennai 600020',
    upiId: 'karuna@okaxis',
    upiHolderName: 'Karuna Foundation',
  });
  assert.equal(step2.success, true);

  // Invalid UPI ID
  const badUpi = shelterStep2Schema.safeParse({
    contactPerson: 'Ravi Kumar',
    phone: '+919876543210',
    fullAddress: '12 Green Avenue, Adyar, Chennai 600020',
    upiId: 'invalid-upi-id', // missing @bank
    upiHolderName: 'Karuna Foundation',
  });
  assert.equal(badUpi.success, false);

  // Valid step 3
  const step3 = shelterStep3Schema.safeParse({
    registrationNumber: 'TN-REG-2021-9981',
    supportLink: 'https://karuna-animals.org',
    description: 'Dedicated animal rescue shelter serving Chennai for over 8 years with food, shelter and medical care.',
    urgency: 'NORMAL',
    urgencyNote: '',
    consent: true,
  });
  assert.equal(step3.success, true);

  // Invalid step 3 without consent
  const badConsent = shelterStep3Schema.safeParse({
    registrationNumber: 'TN-REG-2021-9981',
    supportLink: 'https://karuna-animals.org',
    description: 'Dedicated animal rescue shelter serving Chennai for over 8 years with food, shelter and medical care.',
    urgency: 'NORMAL',
    urgencyNote: '',
    consent: false,
  });
  assert.equal(badConsent.success, false);
});
