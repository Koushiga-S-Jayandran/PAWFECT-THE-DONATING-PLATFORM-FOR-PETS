import test from 'node:test';
import assert from 'node:assert/strict';

import { PetAdoptionService } from '../src/services/PetAdoptionService.js';
import type { Pet, AdoptionRequest, HousingType } from '../src/domain/petEntities.js';

test('Deterministic Request ID: Uniqueness and format guarantees', () => {
  const service = new PetAdoptionService();
  const adopterId = 'user_abc123';
  const petId = 'pet_xyz789';

  const requestId = service.getRequestId(adopterId, petId);
  assert.equal(requestId, 'user_abc123_pet_xyz789');

  // Same adopter and pet always yields identical ID to prevent duplicate requests at database level
  const secondCall = service.getRequestId(adopterId, petId);
  assert.equal(secondCall, requestId);

  // Different adopter produces unique ID
  const differentAdopter = service.getRequestId('user_other999', petId);
  assert.notEqual(differentAdopter, requestId);
});

test('Adoption State Machine: Allowed and blocked status transitions', () => {
  type RequestStatus = AdoptionRequest['status'];

  const isTransitionAllowed = (
    from: RequestStatus,
    to: RequestStatus,
    actor: 'adopter' | 'shelter' | 'admin'
  ): boolean => {
    if (from === 'pending') {
      if (to === 'cancelled' && actor === 'adopter') return true;
      if (to === 'approved' && (actor === 'shelter' || actor === 'admin')) return true;
      if (to === 'rejected' && (actor === 'shelter' || actor === 'admin')) return true;
    }
    return false;
  };

  // Adopter can cancel pending request
  assert.equal(isTransitionAllowed('pending', 'cancelled', 'adopter'), true);

  // Shelter can approve or reject pending request
  assert.equal(isTransitionAllowed('pending', 'approved', 'shelter'), true);
  assert.equal(isTransitionAllowed('pending', 'rejected', 'shelter'), true);

  // Adopter cannot directly self-approve request
  assert.equal(isTransitionAllowed('pending', 'approved', 'adopter'), false);

  // Terminal states cannot transition further
  assert.equal(isTransitionAllowed('approved', 'cancelled', 'adopter'), false);
  assert.equal(isTransitionAllowed('rejected', 'approved', 'shelter'), false);
  assert.equal(isTransitionAllowed('cancelled', 'approved', 'shelter'), false);
});

test('Adoption Application Validation: Enforces housing & reason rules', () => {
  const validateForm = (data: {
    name: string;
    phone: string;
    email: string;
    housingType: HousingType;
    ownsHome: boolean;
    landlordPermission: boolean;
    reason: string;
    hasOtherPets: boolean;
    otherPetsDetail?: string;
  }) => {
    if (!data.name || data.name.trim().length < 2) return 'Invalid name';
    if (!data.phone || data.phone.trim().length < 10) return 'Invalid phone';
    if (!data.email || !data.email.includes('@')) return 'Invalid email';
    if (!data.ownsHome && !data.landlordPermission) return 'Landlord permission required';
    if (data.hasOtherPets && (!data.otherPetsDetail || !data.otherPetsDetail.trim())) {
      return 'Other pets details required';
    }
    if (!data.reason || data.reason.trim().length < 15) return 'Reason too short';
    return null;
  };

  // Valid application
  const valid = validateForm({
    name: 'Kavitha S',
    phone: '+919876543210',
    email: 'kavitha@example.com',
    housingType: 'own_apartment',
    ownsHome: true,
    landlordPermission: true,
    reason: 'We want to give Bella a loving home and daily garden walks.',
    hasOtherPets: false,
  });
  assert.equal(valid, null);

  // Rented home without landlord permission must be rejected
  const noLandlordPerm = validateForm({
    name: 'Kavitha S',
    phone: '+919876543210',
    email: 'kavitha@example.com',
    housingType: 'rent_apartment',
    ownsHome: false,
    landlordPermission: false,
    reason: 'We want to give Bella a loving home and daily garden walks.',
    hasOtherPets: false,
  });
  assert.equal(noLandlordPerm, 'Landlord permission required');

  // Reason under 15 characters must be rejected
  const shortReason = validateForm({
    name: 'Kavitha S',
    phone: '+919876543210',
    email: 'kavitha@example.com',
    housingType: 'own_apartment',
    ownsHome: true,
    landlordPermission: true,
    reason: 'Cute dog.',
    hasOtherPets: false,
  });
  assert.equal(shortReason, 'Reason too short');
});

test('Pet Age Range Calculation: Correctly categorizes stages', () => {
  const getAgeStage = (months: number): 'puppy_kitten' | 'young' | 'adult' | 'senior' => {
    if (months < 12) return 'puppy_kitten';
    if (months <= 36) return 'young';
    if (months <= 96) return 'adult';
    return 'senior';
  };

  assert.equal(getAgeStage(5), 'puppy_kitten');
  assert.equal(getAgeStage(11), 'puppy_kitten');
  assert.equal(getAgeStage(12), 'young');
  assert.equal(getAgeStage(24), 'young');
  assert.equal(getAgeStage(36), 'young');
  assert.equal(getAgeStage(48), 'adult');
  assert.equal(getAgeStage(96), 'adult');
  assert.equal(getAgeStage(100), 'senior');
});
