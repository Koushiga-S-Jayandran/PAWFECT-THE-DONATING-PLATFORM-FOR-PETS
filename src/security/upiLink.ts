/**
 * Pure NPCI UPI Deep Link Generator
 *
 * Formats standards-compliant upi://pay URI strings for UPI QR codes
 * and direct intent links for mobile apps (Google Pay, PhonePe, Paytm, BHIM, etc.).
 */

import { paiseToRupees } from '../utils/money.js';

export interface UpiLinkParams {
  readonly upiId: string;
  readonly payeeName: string;
  readonly amountPaise: number;
  readonly reference: string;
  readonly note: string;
}

export function buildUpiLink(params: {
  upiId: string;
  payeeName: string;
  amountPaise: number;
  reference: string;
  note: string;
}): string {
  const { upiId, payeeName, amountPaise, reference, note } = params;

  if (!upiId || !payeeName || amountPaise <= 0 || !reference) {
    throw new Error('Missing required UPI payment link parameters.');
  }

  const amountRupees = paiseToRupees(amountPaise).toFixed(2);
  const cleanNote = note.replace(/[^\w\s-]/g, '').trim().slice(0, 50);

  const queryParams = new URLSearchParams({
    pa: upiId.trim(),
    pn: payeeName.trim(),
    am: amountRupees,
    cu: 'INR',
    tn: cleanNote || `Pawfect Gift ${reference}`,
    tr: reference,
  });

  return `upi://pay?${queryParams.toString()}`;
}

export function parseUpiLink(uri: string): Record<string, string> {
  if (!uri.startsWith('upi://pay?')) {
    throw new Error('Invalid UPI URI scheme');
  }
  const queryString = uri.replace('upi://pay?', '');
  const searchParams = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    result[key] = val;
  });
  return result;
}
