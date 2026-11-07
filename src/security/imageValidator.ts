/**
 * Magic Bytes Image Validator
 * Verifies the actual binary signature of the file, not just the file extension.
 * Supported: JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF....WEBP).
 * Max size: 5 MB.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export type SupportedImageFormat = 'jpeg' | 'png' | 'webp';

export interface ImageValidationResult {
  readonly valid: boolean;
  readonly format?: SupportedImageFormat;
  readonly error?: string;
}

export async function validateImageBytes(file: Blob): Promise<ImageValidationResult> {
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds the 5 MB limit. Please select a smaller screenshot.',
    };
  }

  if (file.size < 12) {
    return {
      valid: false,
      error: 'File is too small to be a valid image.',
    };
  }

  const headerBuffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(headerBuffer);

  // JPEG check: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, format: 'jpeg' };
  }

  // PNG check: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { valid: true, format: 'png' };
  }

  // WebP check: RIFF at 0..3 and WEBP at 8..11
  if (
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return { valid: true, format: 'webp' };
  }

  return {
    valid: false,
    error: 'Unrecognized image format. Only real JPG, PNG, and WebP screenshots are accepted.',
  };
}

/**
 * Pure synchronous byte array inspector for unit tests
 */
export function inspectImageHeaderBytes(bytes: Uint8Array): ImageValidationResult {
  if (bytes.length < 12) {
    return { valid: false, error: 'Incomplete header' };
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, format: 'jpeg' };
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { valid: true, format: 'png' };
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, format: 'webp' };
  }

  return { valid: false, error: 'Invalid magic bytes' };
}
