/**
 * Proof Submission Service
 * Coordinates validation, client-side metadata stripping, Cloudinary upload,
 * and atomic Firestore batch write with optimistic concurrency.
 */

import type {
  DonationProof,
  EnhancedDonation,
  ProofFlags,
  ProofSubmissionInput,
  Step2BDonationAuditEntry,
} from '../domain/proofEntities.js';
import type {
  ImageUploader,
  ProofReader,
  ProofWriter,
  UtrRegistry,
  HashRegistry,
} from '../domain/proofInterfaces.js';
import {
  InvalidImageError,
  ProofWindowClosedError,
  UtrAlreadyUsedError,
} from '../domain/proofErrors.js';
import { validateImageBytes } from '../security/imageValidator.js';
import { processProofImage } from '../security/imageProcessor.js';
import { evaluateProofWindow } from '../security/proofWindow.js';
import { calculateProofFlags } from '../security/flagCalculator.js';
import { proofFormSchema } from '../security/proofValidation.js';
import { paiseToRupees } from '../utils/money.js';

export class ProofSubmissionService {
  constructor(
    private readonly proofWriter: ProofWriter,
    private readonly proofReader: ProofReader,
    private readonly utrRegistry: UtrRegistry,
    private readonly hashRegistry: HashRegistry,
    private readonly imageUploader: ImageUploader
  ) {}

  async submitProof(params: {
    donation: EnhancedDonation;
    input: ProofSubmissionInput;
    actorUid: string;
    onProgress?: (step: 'validating' | 'processing' | 'uploading' | 'saving') => void;
  }): Promise<{ proof: DonationProof; flags: ProofFlags }> {
    const { donation, input, actorUid, onProgress } = params;

    onProgress?.('validating');

    // 1. Evaluate proof window and eligibility
    const windowCheck = evaluateProofWindow(donation, actorUid);
    if (!windowCheck.allowed) {
      throw new ProofWindowClosedError(windowCheck.reason);
    }

    // 2. Validate form inputs (UTR, amount)
    const paidAmountRupees = paiseToRupees(input.paidAmountPaise);
    const formValidation = proofFormSchema.safeParse({
      utr: input.utr,
      paidAmountRupees,
    });
    if (!formValidation.success) {
      const firstIssue = formValidation.error.issues[0];
      throw new Error(firstIssue?.message || 'Invalid proof details.');
    }

    // 3. Validate image magic bytes and file size
    const byteCheck = await validateImageBytes(input.file);
    if (!byteCheck.valid) {
      throw new InvalidImageError(byteCheck.error);
    }

    // 4. Pre-check UTR uniqueness
    const utrExists = await this.utrRegistry.isUtrUsed(input.utr);
    if (utrExists) {
      throw new UtrAlreadyUsedError();
    }

    onProgress?.('processing');

    // 5. Process image: downscale <= 1600px, strip EXIF metadata, re-encode as JPEG 0.82
    const processed = await processProofImage(input.file);

    // 6. Pre-check hash for duplicate screenshot warning
    const hashExists = await this.hashRegistry.isHashPresent(processed.hash);

    // 7. Calculate flags
    const flags = calculateProofFlags({
      paidAmountPaise: input.paidAmountPaise,
      expectedAmountPaise: donation.amountPaise,
      hashAlreadyExisted: hashExists,
      proofSubmittedAt: null,
    });

    onProgress?.('uploading');

    // 8. Upload to Cloudinary (unsigned, 30s timeout, verifies res.cloudinary.com domain)
    const imageUrl = await this.imageUploader.uploadProofImage(
      processed.blob,
      processed.hash
    );

    onProgress?.('saving');

    // 9. Prepare atomic records
    const attempt = windowCheck.attemptNumber;
    const proofId = `${donation.id}_a${attempt}`;
    const newVersion = (donation.statusVersion || 1) + 1;

    const proof: DonationProof = {
      id: proofId,
      donationId: donation.id,
      donorId: actorUid,
      shelterId: donation.shelterId,
      attempt,
      imageUrl,
      utr: input.utr,
      paidAmountPaise: input.paidAmountPaise,
      imageHash: processed.hash,
      flags,
      createdAt: Date.now(),
    };

    const audit: Step2BDonationAuditEntry = {
      donationId: donation.id,
      reference: donation.reference,
      fromStatus: donation.status,
      toStatus: 'PROOF_SUBMITTED',
      actorUid,
      actorType: 'DONOR',
      timestamp: Date.now(),
    };

    // 10. Atomic Firestore batch commit
    await this.proofWriter.submitProofAtomic({
      donation,
      proof,
      newStatusVersion: newVersion,
      isNewHash: !hashExists,
      audit,
    });

    return { proof, flags };
  }
}
