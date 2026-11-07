/**
 * Date & Time Utilities for Donation TTL and Timers
 */

import { DONATION_CONFIG } from '../config/donationConfig.js';

export function calculateExpiryTimestamp(fromTime: number = Date.now()): number {
  return fromTime + DONATION_CONFIG.EXPIRY_WINDOW_MS;
}

export function isDonationExpired(expiresAt: string | number): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;
  return Date.now() >= expiry;
}

export function getRemainingSeconds(expiresAt: string | number): number {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;
  const diffMs = expiry - Date.now();
  return Math.max(0, Math.floor(diffMs / 1000));
}

export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFriendlyDate(timestamp: string | number): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
