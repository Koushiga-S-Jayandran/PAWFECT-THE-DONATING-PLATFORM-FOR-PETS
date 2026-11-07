/**
 * Cloudinary Direct Unsigned Image Uploader
 * Conforms to Rule 0.6, 0.7, 2.3:
 * - Unsigned uploads only (no API key or secret)
 * - 30-second AbortController timeout
 * - Validates secure_url begins strictly with https://res.cloudinary.com/<CLOUD_NAME>/
 */

import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  PROOF_FOLDER,
  CLOUDINARY_UPLOAD_URL,
  CLOUDINARY_DELIVERY_BASE,
} from '../config/storageConfig.js';
import type { ImageUploader } from '../domain/proofInterfaces.js';
import { UploadFailedError } from '../domain/proofErrors.js';

export class CloudinaryImageUploader implements ImageUploader {
  async uploadProofImage(blob: Blob, hash: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const formData = new FormData();
    formData.append('file', blob, `proof_${hash}.jpg`);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', PROOF_FOLDER);

    try {
      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errMessage = 'Upload failed';
        try {
          const errData = await response.json();
          errMessage = errData.error?.message || response.statusText;
        } catch {
          errMessage = response.statusText;
        }
        throw new UploadFailedError(`Cloudinary error: ${errMessage}`);
      }

      const data = await response.json();
      const secureUrl = data.secure_url;

      if (
        typeof secureUrl !== 'string' ||
        !secureUrl.startsWith(CLOUDINARY_DELIVERY_BASE)
      ) {
        throw new UploadFailedError(
          'Image was uploaded, but the delivery URL does not match the verified Cloudinary domain.'
        );
      }

      return secureUrl;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof UploadFailedError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new UploadFailedError('Screenshot upload timed out after 30 seconds. Please retry.');
      }
      throw new UploadFailedError(
        error instanceof Error ? error.message : 'Screenshot upload failed. Please try again.'
      );
    }
  }
}
