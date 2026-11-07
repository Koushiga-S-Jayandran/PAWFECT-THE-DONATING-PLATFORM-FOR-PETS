/**
 * Zod Schemas for Shelter Registration, Moderation, and Updates
 * All state and district validations are derived dynamically from regions.ts
 */

import { z } from 'zod';
import {
  getEnabledRegions,
  isStateCodeEnabled,
  isValidDistrictForState,
} from '../config/regions.js';
import { VALID_ANIMAL_TYPE_IDS, type AnimalTypeId } from '../config/animalTypes.js';
import { VALID_URGENCY_IDS, type UrgencyLevelId } from '../config/urgencyLevels.js';
import { sanitizeText, sanitizeMultilineText, isSafeHttpsUrl } from './textSanitizer.js';

// UPI ID Regex as per specification: ^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}$
export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}$/;

// Phone Regex: +91 followed by 10 digits starting 6 to 9
export const INDIAN_PHONE_REGEX = /^\+91[6-9][0-9]{9}$/;

export const shelterStep1BaseSchema = z.object({
  name: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(3, 'Shelter name must be at least 3 characters')
        .max(80, 'Shelter name must not exceed 80 characters')
    ),
  stateCode: z
    .string()
    .trim()
    .refine(
      (code) => isStateCodeEnabled(code),
      'Selected state is not currently enabled for shelter registration'
    ),
  district: z.string().trim().min(1, 'Please select a district'),
  area: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(2, 'Area/Locality must be at least 2 characters')
        .max(80, 'Area/Locality must not exceed 80 characters')
    ),
  animalTypes: z
    .array(z.string())
    .min(1, 'Please select at least one animal type cared for')
    .max(6, 'Maximum 6 animal types can be selected')
    .refine(
      (arr) => arr.every((item) => VALID_ANIMAL_TYPE_IDS.includes(item)),
      'Invalid animal type selected'
    ),
});

export const shelterStep1Schema = shelterStep1BaseSchema.superRefine((data, ctx) => {
  if (!isValidDistrictForState(data.stateCode, data.district)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['district'],
      message: `District is not valid for the selected state (${data.stateCode})`,
    });
  }
});

export const shelterStep2Schema = z.object({
  contactPerson: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(2, 'Contact person name must be at least 2 characters')
        .max(80, 'Contact person name must not exceed 80 characters')
    ),
  phone: z
    .string()
    .trim()
    .transform((val) => {
      const cleaned = val.replace(/[\s-]/g, '');
      if (/^[6-9]\d{9}$/.test(cleaned)) {
        return `+91${cleaned}`;
      }
      return cleaned;
    })
    .pipe(
      z
        .string()
        .regex(
          INDIAN_PHONE_REGEX,
          'Phone must be a valid 10-digit Indian mobile number (+91 followed by digits starting with 6-9)'
        )
    ),
  fullAddress: z
    .string()
    .transform(sanitizeMultilineText)
    .pipe(
      z
        .string()
        .min(10, 'Full address must be at least 10 characters')
        .max(250, 'Full address must not exceed 250 characters')
    ),
  upiId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      UPI_ID_REGEX,
      'Please enter a valid UPI ID (e.g. shelter@okaxis, rescue@sbi)'
    ),
  upiHolderName: z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(2, 'UPI Account Holder Name must be at least 2 characters')
        .max(80, 'UPI Account Holder Name must not exceed 80 characters')
    ),
});

export const shelterStep3Schema = z.object({
  registrationNumber: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(60, 'Registration number must not exceed 60 characters')),
  supportLink: z
    .string()
    .trim()
    .refine(
      (url) => !url || (url.length <= 200 && isSafeHttpsUrl(url)),
      'Support link must be a valid secure URL starting with https:// (max 200 characters)'
    ),
  description: z
    .string()
    .transform(sanitizeMultilineText)
    .pipe(
      z
        .string()
        .min(30, 'Shelter description must be at least 30 characters')
        .max(500, 'Shelter description must not exceed 500 characters')
    ),
  urgency: z.enum(['NORMAL', 'URGENT', 'CRITICAL']),
  urgencyNote: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(140, 'Urgency note must not exceed 140 characters')),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must confirm that the details provided are true and verified',
  }),
});

// Full Combined Registration Form Schema
export const shelterRegistrationSchema = shelterStep1BaseSchema
  .merge(shelterStep2Schema)
  .merge(shelterStep3Schema)
  .superRefine((data, ctx) => {
    if (!isValidDistrictForState(data.stateCode, data.district)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['district'],
        message: `District is not valid for the selected state (${data.stateCode})`,
      });
    }
  });

export type ShelterRegistrationFormData = z.infer<typeof shelterRegistrationSchema>;

// Admin Moderation Action Schema
export const moderationActionSchema = z.object({
  reason: z
    .string()
    .transform(sanitizeMultilineText)
    .pipe(
      z
        .string()
        .min(10, 'Reason must be at least 10 characters')
        .max(300, 'Reason must not exceed 300 characters')
    ),
});

// Urgency Update Schema (for Approved Shelter Owners)
export const urgencyUpdateSchema = z.object({
  urgency: z.enum(['NORMAL', 'URGENT', 'CRITICAL'] as const),
  urgencyNote: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(140, 'Urgency note must not exceed 140 characters')),
});
