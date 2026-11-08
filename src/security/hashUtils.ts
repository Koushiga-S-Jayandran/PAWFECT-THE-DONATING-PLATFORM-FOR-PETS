/**
 * Cryptographic Hash Utilities for Image & Proof Verification
 * Produces deterministic 64-character lowercase hex SHA-256 strings.
 */

export async function computeSha256Hex(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const source = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const hashBuffer = await crypto.subtle.digest('SHA-256', source as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isValidSha256Hex(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}
