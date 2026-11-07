/**
 * Cryptographic Hashing for Privacy & Rate-Limiting Indexing
 * Uses standard Web Crypto SHA-256. Never logs raw emails.
 */

import type { Hasher } from '../domain/interfaces.js';

export function normalizeEmail(rawEmail: string): string {
  if (!rawEmail || typeof rawEmail !== 'string') return '';
  return rawEmail.normalize('NFKC').trim().toLowerCase().slice(0, 254);
}

export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class WebCryptoHasher implements Hasher {
  async hashEmail(email: string): Promise<string> {
    const normalized = normalizeEmail(email);
    return sha256Hex(normalized);
  }
}

export const defaultHasher = new WebCryptoHasher();
