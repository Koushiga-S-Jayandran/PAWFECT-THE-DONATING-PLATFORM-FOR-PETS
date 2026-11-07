/**
 * Client-Side Image Processor
 * Strips camera/device metadata (EXIF/location) by re-drawing onto an HTML Canvas.
 * Downscales image so maximum dimension <= 1600px.
 * Re-encodes as JPEG at quality 0.82.
 * Computes deterministic SHA-256 hash of processed bytes.
 */

import { computeSha256Hex } from './hashUtils.js';

export const MAX_DIMENSION = 1600;
export const ENCODE_QUALITY = 0.82;

export interface ProcessedImage {
  readonly blob: Blob;
  readonly arrayBuffer: ArrayBuffer;
  readonly hash: string;
  readonly width: number;
  readonly height: number;
}

export async function processProofImage(file: Blob): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-preserving downscale if larger than 1600px
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // Fill white background for transparent PNG/WebP conversions
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image onto canvas (cleans out EXIF, GPS, camera metadata)
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to encode image from canvas'));
              return;
            }

            const arrayBuffer = await blob.arrayBuffer();
            const hash = await computeSha256Hex(arrayBuffer);

            resolve({
              blob,
              arrayBuffer,
              hash,
              width,
              height,
            });
          },
          'image/jpeg',
          ENCODE_QUALITY
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image for processing'));
    };

    img.src = objectUrl;
  });
}
