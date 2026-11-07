/**
 * Centralized Zod Validation Schemas
 * Reused consistently across forms, route guards, and services.
 */

import { z } from 'zod';
import { normalizeEmail } from './hash.js';
import { validatePasswordStrength } from './passwordRules.js';
import { ALLOWED_REDIRECT_PATHS, ROUTES } from '../config/constants.js';

export const emailSchema = z
  .string()
  .min(3, 'Email address is required')
  .max(254, 'Email must not exceed 254 characters')
  .transform((val) => normalizeEmail(val))
  .refine(
    (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Please enter a valid email address'
  );

export const phoneSchema = z
  .string()
  .trim()
  .transform((val) => {
    // If entered without +91, normalize with +91 if 10 digits
    const cleaned = val.replace(/[\s-]/g, '');
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    return cleaned;
  })
  .refine(
    (val) => /^\+91[6-9]\d{9}$/.test(val),
    'Phone must be a valid 10-digit Indian mobile number (+91 followed by digits starting with 6-9)'
  );

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must not exceed 100 characters');

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .refine((val) => /[a-zA-Z]/.test(val), 'Password must contain at least one letter')
  .refine((val) => /[0-9]/.test(val), 'Password must contain at least one number');

export const signupSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    consent: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms of Service and Privacy Policy to proceed',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }

    const strength = validatePasswordStrength(data.password, data.email);
    if (!strength.isValid) {
      for (const err of strength.errors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err,
          path: ['password'],
        });
      }
    }
  });

export type SignupFormData = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }

    const strength = validatePasswordStrength(data.password);
    if (!strength.isValid) {
      for (const err of strength.errors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err,
          path: ['password'],
        });
      }
    }
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Route Guard / Next Parameter Sanitizer
 * Prevents Open Redirect Vulnerabilities
 */
export function sanitizeRedirectPath(rawPath: string | null | undefined): string {
  if (!rawPath || typeof rawPath !== 'string') {
    return ROUTES.DASHBOARD;
  }

  const trimmed = rawPath.trim();

  // Must begin with a single '/', cannot start with '//', and cannot contain schemes or backslashes
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    trimmed.includes(':')
  ) {
    return ROUTES.DASHBOARD;
  }

  // Extract base path without query parameters
  const basePath = trimmed.split('?')[0];

  if (ALLOWED_REDIRECT_PATHS.includes(basePath)) {
    return trimmed;
  }

  return ROUTES.DASHBOARD;
}
