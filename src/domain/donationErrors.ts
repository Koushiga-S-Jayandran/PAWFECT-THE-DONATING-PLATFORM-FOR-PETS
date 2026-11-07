/**
 * Typed Domain Errors for Donation Operations
 */

export class DonationValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'DonationValidationError';
  }
}

export class DonationNotFoundError extends Error {
  constructor(public readonly identifier: string) {
    super(`Donation '${identifier}' was not found.`);
    this.name = 'DonationNotFoundError';
  }
}

export class DonationStateError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
    reason?: string
  ) {
    super(
      `Illegal donation transition from '${fromStatus}' to '${toStatus}'. ${
        reason || ''
      }`.trim()
    );
    this.name = 'DonationStateError';
  }
}

export class DonationExpiredError extends Error {
  constructor(public readonly reference: string) {
    super(`Donation '${reference}' has expired. Please create a new gift.`);
    this.name = 'DonationExpiredError';
  }
}

export class DuplicateReferenceError extends Error {
  constructor(public readonly reference: string) {
    super(`Donation reference '${reference}' already exists.`);
    this.name = 'DuplicateReferenceError';
  }
}

export class ShelterNotPayableError extends Error {
  constructor(public readonly shelterId: string, reason?: string) {
    super(
      `Shelter '${shelterId}' cannot accept donations. ${
        reason || 'It may not be approved or UPI details are missing.'
      }`
    );
    this.name = 'ShelterNotPayableError';
  }
}
