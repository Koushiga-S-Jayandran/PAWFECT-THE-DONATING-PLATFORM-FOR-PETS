/**
 * Cloudinary Storage Configuration
 * Unsigned client-side direct uploads.
 * No API key or API secret is ever exposed or stored.
 */

export const CLOUDINARY_CLOUD_NAME = 'hzhohdqe';
export const CLOUDINARY_UPLOAD_PRESET = 'pawfect_proofs';
export const PROOF_FOLDER = 'pawfect/proofs';

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
export const CLOUDINARY_DELIVERY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/`;
