/**
 * Proof Submission Validation Schema
 * Shared Zod schema for UTR, paid amount, and rejection reasons.
 */

import { z } from 'zod';
import { rupeesToPaise } from '../utils/money.js';

export const proofFormSchema = z.object({
  utr: z
    .string()
    .trim()
    .regex(/^[0-9]{12}$/, 'UTR must be exactly 12 numeric digits.'),
  paidAmountRupees: z
    .number({ message: 'Please enter a valid payment amount.' })
    .positive('Amount paid must be greater than zero.')
    .max(100000, 'Amount cannot exceed ₹1,00,000.')
    .refine(
      (val) => Number((val * 100).toFixed(0)) === Math.round(val * 100),
      'Amount can have at most 2 decimal places.'
    ),
});

export const shelterRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Rejection reason must be at least 10 characters so the donor understands.')
    .max(300, 'Rejection reason cannot exceed 300 characters.'),
});

export type ProofFormData = z.infer<typeof proofFormSchema>;
export type ShelterRejectData = z.infer<typeof shelterRejectSchema>;
