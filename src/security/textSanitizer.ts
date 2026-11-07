/**
 * Text Sanitizer & Safe Formatting Utilities
 * Strips angle brackets, control characters, collapses whitespace,
 * and validates external URLs.
 */

export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Remove control characters (except newline, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip angle brackets to prevent HTML/XSS injection
    .replace(/[<>]/g, '')
    // Collapse multiple horizontal whitespaces into single space
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();
}

export function sanitizeMultilineText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[<>]/g, '')
    .split('\n')
    .map((line) => line.replace(/[^\S\r\n]+/g, ' ').trim())
    .join('\n')
    .trim();
}

export function isSafeHttpsUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
