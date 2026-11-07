/**
 * Typed Domain Errors for Shelter Operations
 */

export class IllegalTransitionError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly reason?: string
  ) {
    super(
      `Illegal shelter status transition from '${fromStatus}' to '${toStatus}'. ${
        reason || ''
      }`.trim()
    );
    this.name = 'IllegalTransitionError';
  }
}

export class NotAuthorizedError extends Error {
  constructor(message: string = 'You are not authorized to perform this action.') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

export class StaleVersionError extends Error {
  constructor(
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super('This shelter was updated by someone else. Reloaded.');
    this.name = 'StaleVersionError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RegionNotEnabledError extends Error {
  constructor(public readonly stateCode: string) {
    super(`Region '${stateCode}' is not currently enabled for shelter registration.`);
    this.name = 'RegionNotEnabledError';
  }
}
