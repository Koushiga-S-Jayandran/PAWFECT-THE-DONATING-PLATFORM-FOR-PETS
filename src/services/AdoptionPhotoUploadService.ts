/**
 * Adoption Photo Upload Service
 * Validates image magic bytes and file size, strips EXIF/GPS metadata & compresses
 * via HTML Canvas, then uploads to Cloudinary (unsigned preset, zero secrets).
 */

import { validateImageBytes } from '../security/imageValidator.js';
import { processProofImage } from '../security/imageProcessor.js';

export const CLOUDINARY_CLOUD_NAME = 'hzhohdqe';
export const CLOUDINARY_UPLOAD_PRESET = 'pawfect_unsigned';
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
export const CLOUDINARY_DELIVERY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/`;

export interface UploadedListingPhoto {
  url: string;
  hash: string;
  width: number;
  height: number;
}

export async function parseCloudinaryErrorMessage(response: Response): Promise<string> {
  const fallback = response.statusText || `HTTP ${response.status} error`;
  try {
    const rawText = await response.text();
    if (!rawText) return fallback;
    try {
      const json = JSON.parse(rawText);
      const cloudinaryMsg = json?.error?.message || json?.message;
      if (typeof cloudinaryMsg === 'string' && cloudinaryMsg.trim().length > 0) {
        return cloudinaryMsg.trim();
      }
    } catch {
      // Non-JSON response body from Cloudinary/proxy
    }
    return rawText.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function uploadBlobToCloudinary(
  blob: Blob,
  filename: string,
  signal?: AbortSignal
): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    const realMessage = await parseCloudinaryErrorMessage(response);
    throw new Error(`Upload failed: ${realMessage}`);
  }

  const data = await response.json();
  const secureUrl = data?.secure_url;
  if (typeof secureUrl !== 'string' || !secureUrl.startsWith(CLOUDINARY_DELIVERY_BASE)) {
    throw new Error('Uploaded photo returned an untrusted delivery URL.');
  }

  return secureUrl;
}

export class AdoptionPhotoUploadService {
  async validateAndUploadPhoto(
    file: File,
    onStage?: (stage: 'validating' | 'compressing' | 'uploading') => void
  ): Promise<UploadedListingPhoto> {
    onStage?.('validating');
    const validation = await validateImageBytes(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Unsupported or corrupted image file.');
    }

    onStage?.('compressing');
    const processed = await processProofImage(file);

    onStage?.('uploading');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const secureUrl = await uploadBlobToCloudinary(
        processed.blob,
        `pet_${processed.hash.slice(0, 12)}.jpg`,
        controller.signal
      );

      clearTimeout(timeoutId);

      return {
        url: secureUrl,
        hash: processed.hash,
        width: processed.width,
        height: processed.height,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error('Photo upload timed out after 30 seconds. Please retry.');
      }
      throw err instanceof Error ? err : new Error('Could not upload photo.');
    }
  }
}

export const adoptionPhotoUploadService = new AdoptionPhotoUploadService();
