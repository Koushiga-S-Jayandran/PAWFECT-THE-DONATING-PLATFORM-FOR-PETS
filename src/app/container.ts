/**
 * Dependency Injection Container
 * The single source of truth for wiring repositories, gateways, and services.
 */

import { FirebaseAuthGateway } from '../repositories/FirebaseAuthGateway.js';
import { FirebaseUserProfileRepository } from '../repositories/FirebaseUserProfileRepository.js';
import { FirebaseThrottleStore } from '../repositories/FirebaseThrottleStore.js';
import { defaultHasher } from '../security/hash.js';
import { ThrottleService, SystemClock } from '../services/ThrottleService.js';
import { SignupService } from '../services/SignupService.js';
import { LoginService } from '../services/LoginService.js';
import { PasswordResetService } from '../services/PasswordResetService.js';
import { EmailVerificationService } from '../services/EmailVerificationService.js';

// Repositories & Gateways
export const authGateway = new FirebaseAuthGateway();
export const userProfileRepository = new FirebaseUserProfileRepository();
export const throttleStore = new FirebaseThrottleStore();
export const hasher = defaultHasher;
export const clock = new SystemClock();

// Business Logic Services
export const throttleService = new ThrottleService(
  throttleStore,
  hasher,
  clock
);

export const signupService = new SignupService(
  authGateway,
  userProfileRepository
);

export const loginService = new LoginService(
  authGateway,
  throttleService
);

export const passwordResetService = new PasswordResetService(
  authGateway,
  throttleStore,
  throttleService,
  hasher
);

export const emailVerificationService = new EmailVerificationService(
  authGateway,
  throttleStore,
  hasher
);
