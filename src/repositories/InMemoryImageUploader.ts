/**
 * In-Memory Test Double for ImageUploader
 */

import { CLOUDINARY_DELIVERY_BASE } from '../config/storageConfig.js';
import type { ImageUploader } from '../domain/proofInterfaces.js';

export class InMemoryImageUploader implements ImageUploader {
  private uploads = new Map<string, Blob>();

  async uploadProofImage(blob: Blob, hash: string): Promise<string> {
    this.uploads.set(hash, blob);
    return `${CLOUDINARY_DELIVERY_BASE}pawfect/proofs/${hash}.jpg`;
  }

  getUploadedBlob(hash: string): Blob | undefined {
    return this.uploads.get(hash);
  }

  clear(): void {
    this.uploads.clear();
  }
}
