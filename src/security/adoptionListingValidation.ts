/**
 * Adoption Listing Validators & Anti-Abuse Protections
 * - Step-by-step & complete Zod validation
 * - Script/HTML/XSS stripping
 * - Link/URL & spam blocker
 * - Indian 10-digit mobile validator
 * - State/district validation via single config source (regions.ts)
 * - Deterministic duplicate listing fingerprint
 */

import { z } from 'zod';
import {
  LISTING_GENDERS,
  LISTING_LIMITS,
  LISTING_SIZES,
  LISTING_SPECIES,
  LISTER_TYPES,
  TRI_STATE_FLAGS,
  HOUSING_TYPES,
} from '../config/adoptionListingConfig.js';
import {
  isStateCodeEnabled,
  isValidDistrictForState,
  getRegionByCode,
} from '../config/regions.js';
import { sanitizeMultilineText, sanitizeText } from './textSanitizer.js';
import { computeSha256Hex } from './hashUtils.js';

const URL_OR_SPAM_PATTERNS: readonly RegExp[] = [
  /https?:\/\//i,
  /\bwww\./i,
  /<script[\s>]/i,
  /javascript:/i,
  /\b(?:wa\.me|t\.me|bit\.ly|tinyurl\.com|goo\.gl)\b/i,
  /\b[a-z0-9-]{2,}\.(?:com|in|org|net|co|io|me|info|biz|xyz|shop|store)\b/i,
];

const REPEATED_CHAR_SPAM = /(.)\1{9,}/;

export function containsLinkOrSpam(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  for (const pattern of URL_OR_SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'Links, URLs, website domains, and scripts are not allowed in listings.';
    }
  }
  if (REPEATED_CHAR_SPAM.test(trimmed)) {
    return 'Text appears to contain repeated spam characters.';
  }
  return null;
}

export function normalizeIndianMobile(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return cleaned;
}

export function isValidIndianMobile(raw: string): boolean {
  const normalized = normalizeIndianMobile(raw);
  return /^\+91[6-9]\d{9}$/.test(normalized);
}

const cleanSafeText = (label: string, min: number, max: number) =>
  z
    .string()
    .transform((v) => sanitizeText(v))
    .refine((v) => v.length >= min, `${label} must be at least ${min} characters`)
    .refine((v) => v.length <= max, `${label} must be at most ${max} characters`)
    .refine((v) => !containsLinkOrSpam(v), `${label} cannot contain links or spam`);

export const stepAnimalSchema = z
  .object({
    listerType: z.enum(LISTER_TYPES),
    isUnnamed: z.boolean(),
    name: z.string().transform((v) => sanitizeText(v)),
    species: z.enum(LISTING_SPECIES),
    breed: cleanSafeText('Breed', 2, 80),
    ageMonths: z
      .number({ message: 'Please enter a valid age' })
      .int('Age must be a whole number')
      .min(0, 'Age cannot be negative')
      .max(300, 'Age cannot exceed 300 months (25 years)'),
    gender: z.enum(LISTING_GENDERS),
    size: z.enum(LISTING_SIZES),
    color: cleanSafeText('Colour', 2, 60),
  })
  .superRefine((data, ctx) => {
    if (!data.isUnnamed) {
      if (data.name.length < 2 || data.name.length > 50) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Name must be 2 to 50 characters, or check "Unnamed".',
          path: ['name'],
        });
      }
      const spamErr = containsLinkOrSpam(data.name);
      if (spamErr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: spamErr,
          path: ['name'],
        });
      }
    }
  });

export const stepHealthNatureSchema = z.object({
  vaccinated: z.boolean(),
  sterilised: z.boolean(),
  injuriesOrConditions: z
    .string()
    .transform((v) => sanitizeMultilineText(v))
    .refine((v) => v.length <= 400, 'Medical notes must be at most 400 characters')
    .refine((v) => !containsLinkOrSpam(v), 'Links are not allowed in medical notes'),
  temperament: z
    .array(z.string().transform((v) => sanitizeText(v)))
    .min(1, 'Select at least 1 temperament trait')
    .max(LISTING_LIMITS.MAX_TEMPERAMENT_TAGS, `Choose at most ${LISTING_LIMITS.MAX_TEMPERAMENT_TAGS} traits`)
    .refine(
      (tags) => tags.every((t) => t.length >= 2 && t.length <= 32 && !containsLinkOrSpam(t)),
      'Each temperament trait must be 2-32 characters without links'
    ),
  goodWithKids: z.enum(TRI_STATE_FLAGS),
  goodWithOtherPets: z.enum(TRI_STATE_FLAGS),
});

export const stepPhotosSchema = z.object({
  photos: z
    .array(
      z
        .string()
        .refine(
          (url) => url.startsWith('https://res.cloudinary.com/'),
          'Photos must be uploaded securely first.'
        )
    )
    .min(LISTING_LIMITS.MIN_PHOTOS, 'Please upload at least 1 photo')
    .max(LISTING_LIMITS.MAX_PHOTOS, `You can upload up to ${LISTING_LIMITS.MAX_PHOTOS} photos`),
});

export const stepStorySchema = z.object({
  story: z
    .string()
    .transform((v) => sanitizeMultilineText(v))
    .refine(
      (v) => v.length >= LISTING_LIMITS.STORY_MIN_LENGTH,
      `Please write at least ${LISTING_LIMITS.STORY_MIN_LENGTH} characters explaining why this animal needs a home`
    )
    .refine(
      (v) => v.length <= LISTING_LIMITS.STORY_MAX_LENGTH,
      `Story cannot exceed ${LISTING_LIMITS.STORY_MAX_LENGTH} characters`
    )
    .refine(
      (v) => !containsLinkOrSpam(v),
      'Links, URLs, social handles, and scripts are not allowed in the story'
    ),
});

export const stepLocationSchema = z
  .object({
    stateCode: z.string().trim(),
    district: z.string().trim(),
    city: cleanSafeText('City / Town', 2, 80),
  })
  .superRefine((data, ctx) => {
    if (!isStateCodeEnabled(data.stateCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only Tamil Nadu and Kerala are supported at launch.',
        path: ['stateCode'],
      });
      return;
    }
    if (!isValidDistrictForState(data.stateCode, data.district)) {
      const region = getRegionByCode(data.stateCode);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Select a valid district in ${region?.name || data.stateCode}.`,
        path: ['district'],
      });
    }
  });

export const stepContactSchema = z.object({
  contactName: cleanSafeText('Contact name', 2, 80),
  phone: z
    .string()
    .transform((val) => normalizeIndianMobile(val))
    .refine(
      (val) => /^\+91[6-9]\d{9}$/.test(val),
      'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9'
    ),
  revealOnlyToApproved: z.boolean(),
  phoneVerified: z
    .boolean()
    .refine((v) => v === true, 'Please verify your mobile number via OTP before submitting'),
});

export const interestRequestSchema = z.object({
  name: cleanSafeText('Full name', 2, 80),
  housingType: z.enum(HOUSING_TYPES),
  experience: cleanSafeText('Pet care experience', 3, 120),
  reason: z
    .string()
    .transform((v) => sanitizeMultilineText(v))
    .refine((v) => v.length >= 20, 'Please write at least 20 characters on why you want to adopt')
    .refine((v) => v.length <= 600, 'Reason must be under 600 characters')
    .refine((v) => !containsLinkOrSpam(v), 'Links or spam are not allowed'),
});

export const reportListingSchema = z.object({
  reason: z.enum([
    'suspected_sale',
    'fraud_or_upfront_fee',
    'animal_cruelty',
    'misleading_info',
    'other',
  ]),
  details: z
    .string()
    .transform((v) => sanitizeMultilineText(v))
    .refine((v) => v.length >= 10, 'Please include at least 10 characters explaining the issue')
    .refine((v) => v.length <= 500, 'Report details cannot exceed 500 characters')
    .refine((v) => !containsLinkOrSpam(v), 'Links or scripts are not allowed'),
});

export const moderationReasonSchema = z
  .string()
  .transform((v) => sanitizeMultilineText(v))
  .refine(
    (v) => v.length >= LISTING_LIMITS.REASON_MIN_LENGTH,
    `Reason must be at least ${LISTING_LIMITS.REASON_MIN_LENGTH} characters`
  )
  .refine(
    (v) => v.length <= LISTING_LIMITS.REASON_MAX_LENGTH,
    `Reason must be at most ${LISTING_LIMITS.REASON_MAX_LENGTH} characters`
  )
  .refine((v) => !containsLinkOrSpam(v), 'Reason cannot contain links or scripts');

/**
 * Compute deterministic SHA-256 duplicate fingerprint for an adoption listing.
 * Blocks accidentally or maliciously creating identical active listings.
 */
export async function computeListingFingerprint(params: {
  listerUid: string;
  species: string;
  name: string;
  breed: string;
  gender: string;
  ageMonths: number;
  stateCode: string;
  district: string;
}): Promise<string> {
  const canonical = [
    params.listerUid.trim(),
    params.species.trim().toLowerCase(),
    params.name.trim().toLowerCase(),
    params.breed.trim().toLowerCase(),
    params.gender.trim().toLowerCase(),
    String(params.ageMonths),
    params.stateCode.trim().toUpperCase(),
    params.district.trim().toLowerCase(),
  ].join('|');

  const encoder = new TextEncoder();
  return computeSha256Hex(encoder.encode(canonical));
}
