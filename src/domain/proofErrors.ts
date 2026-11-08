/**
 * Typed Domain Errors for Proof Submission and Shelter Payment Confirmation (Step 2B)
 */

export class UtrAlreadyUsedError extends Error {
  constructor(message = 'This transaction number was already used on another donation. Please check it.') {
    super(message);
    this.name = 'UtrAlreadyUsedError';
  }
}

export class ProofWindowClosedError extends Error {
  constructor(message = 'Proof submission window has closed for this donation.') {
    super(message);
    this.name = 'ProofWindowClosedError';
  }
}

export class UploadFailedError extends Error {
  constructor(message = 'Screenshot upload failed. Please try again.') {
    super(message);
    this.name = 'UploadFailedError';
  }
}

export class InvalidImageError extends Error {
  constructor(message = 'Invalid image file. Please provide a valid JPG, PNG, or WebP screenshot under 5 MB.') {
    super(message);
    this.name = 'InvalidImageError';
  }
}

export class StaleVersionError extends Error {
  constructor(message = 'This payment was updated. Reloaded.') {
    super(message);
    this.name = 'StaleVersionError';
  }
}

import { DonationStateError } from './donationErrors.js';

export class IllegalTransitionError extends DonationStateError {
  constructor(fromStatus: string, toStatus: string, reason?: string) {
    super(fromStatus, toStatus, reason);
    this.name = 'IllegalTransitionError';
  }
}

export class NotAuthorizedError extends Error {
  constructor(message = 'You are not authorized to perform this action.') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

export class RejectionLimitExceededError extends Error {
  constructor(message = 'Maximum proof submission attempts (3) exceeded.') {
    super(message);
    this.name = 'RejectionLimitExceededError';
  }
}
