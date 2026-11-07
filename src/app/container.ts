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

// Shelter Repositories & Services (Step 1)
import { FirebaseShelterRepository } from '../repositories/FirebaseShelterRepository.js';
import { ShelterRegistrationService } from '../services/ShelterRegistrationService.js';
import { ShelterModerationService } from '../services/ShelterModerationService.js';
import { ShelterBrowseService } from '../services/ShelterBrowseService.js';

export const shelterRepository = new FirebaseShelterRepository();
export const shelterReader = shelterRepository;
export const shelterWriter = shelterRepository;
export const adminDirectory = shelterRepository;

export const shelterRegistrationService = new ShelterRegistrationService(
  shelterReader,
  shelterWriter
);

export const shelterModerationService = new ShelterModerationService(
  shelterReader,
  shelterWriter,
  adminDirectory
);

export const shelterBrowseService = new ShelterBrowseService(shelterReader);

// Donation & Gift Giving Repositories & Services (Step 2)
import { FirebaseDonationRepository } from '../repositories/FirebaseDonationRepository.js';
import { DonationCreationService } from '../services/DonationCreationService.js';
import { DonationLifecycleService } from '../services/DonationLifecycleService.js';

export const donationRepository = new FirebaseDonationRepository();
export const donationReader = donationRepository;
export const donationWriter = donationRepository;

export const donationCreationService = new DonationCreationService(
  donationWriter,
  donationReader,
  shelterReader
);

export const donationLifecycleService = new DonationLifecycleService(
  donationReader,
  donationWriter
);
