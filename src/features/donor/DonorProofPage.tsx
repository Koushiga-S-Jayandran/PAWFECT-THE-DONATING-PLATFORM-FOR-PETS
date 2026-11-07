/**
 * Donor Payment Proof Upload Page
 * Route: /donations/:id/proof
 * Validates eligibility, checks image magic bytes, resizes/strips EXIF client-side,
 * uploads to Cloudinary, and commits batch write.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Button } from '../../ui/components/Button.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { donationReader, proofSubmissionService } from '../../app/container.js';
import { useAuth } from '../auth/RouteGuards.js';
import type { EnhancedDonation } from '../../domain/proofEntities.js';
import { evaluateProofWindow } from '../../security/proofWindow.js';
import { validateImageBytes } from '../../security/imageValidator.js';
import { proofFormSchema } from '../../security/proofValidation.js';
import { formatRupees, paiseToRupees, rupeesToPaise } from '../../utils/money.js';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Lock,
  Clock,
} from 'lucide-react';

export function DonorProofPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [donation, setDonation] = useState<EnhancedDonation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stepper state (1: Screenshot, 2: Details, 3: Review & Submit)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form values
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [paidRupees, setPaidRupees] = useState('');

  // Validation errors
  const [fileError, setFileError] = useState<string | null>(null);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<'validating' | 'processing' | 'uploading' | 'saving' | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadDonation() {
      if (!id) return;
      try {
        setLoading(true);
        const data = (await donationReader.getDonationById(id)) as EnhancedDonation | null;
        if (!data) {
          setError('Donation record not found.');
          return;
        }
        setDonation(data);
        // Pre-fill expected rupees as default
        setPaidRupees(paiseToRupees(data.amountPaise).toString());
      } catch (err) {
        setError('Could not load donation details. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
    loadDonation();
  }, [id]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-16 text-center w-full">
          <div className="w-10 h-10 border-4 border-[#7B1E3A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6E6259] font-serif">Checking payment proof eligibility...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-16 w-full">
          <Card className="text-center p-8">
            <AlertCircle className="w-12 h-12 text-[#9A3B5A] mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-[#231A1D] mb-2">Unable to Load Proof Page</h2>
            <p className="text-[#6E6259] mb-6">{error || 'Record could not be retrieved.'}</p>
            <Button onClick={() => navigate('/my-donations')} variant="outline">
              Back to My Donations
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Check window eligibility
  const windowCheck = evaluateProofWindow(donation, currentUser?.uid || '');
  if (!windowCheck.allowed) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-16 w-full">
          <Card className="text-center p-8">
            <Lock className="w-12 h-12 text-[#6E6259] mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-[#231A1D] mb-2">Proof Submission Closed</h2>
            <p className="text-[#6E6259] mb-6">{windowCheck.reason}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate(`/donate/pay/${donation.id}`)} variant="outline">
                View Payment Details
              </Button>
              <Button onClick={() => navigate('/my-donations')} variant="primary">
                My Donations
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Handle file selection and magic byte check
  const handleFileChange = async (file: File | null) => {
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    const validation = await validateImageBytes(file);
    if (!validation.valid) {
      setFileError(validation.error || 'Invalid image file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Step 1 to Step 2 validation
  const handleProceedToDetails = () => {
    if (!selectedFile) {
      setFileError('Please select or drop a payment screenshot.');
      return;
    }
    setStep(2);
  };

  // Step 2 to Step 3 validation
  const handleProceedToReview = () => {
    setUtrError(null);
    setAmountError(null);

    const parsedNum = parseFloat(paidRupees);
    const result = proofFormSchema.safeParse({
      utr: utr.trim(),
      paidAmountRupees: isNaN(parsedNum) ? 0 : parsedNum,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'utr') setUtrError(issue.message);
        if (issue.path[0] === 'paidAmountRupees') setAmountError(issue.message);
      }
      return;
    }

    setStep(3);
  };

  // Submit proof
  const handleSubmit = async () => {
    if (!selectedFile || !currentUser) return;

    try {
      setSubmitting(true);
      setError(null);

      const parsedNum = parseFloat(paidRupees);
      const paidAmountPaise = rupeesToPaise(parsedNum);

      await proofSubmissionService.submitProof({
        donation,
        input: {
          donationId: donation.id,
          utr: utr.trim(),
          paidAmountPaise,
          file: selectedFile,
        },
        actorUid: currentUser.uid,
        onProgress: (p) => setSubmitProgress(p),
      });

      setSubmitSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please retry.');
    } finally {
      setSubmitting(false);
      setSubmitProgress(null);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-16 w-full">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-[#F3E3E8] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-[#7B1E3A]" />
            </div>
            <h2 className="text-2xl font-serif text-[#231A1D] mb-2">Payment Proof Submitted</h2>
            <p className="text-[#6E6259] mb-6">
              Reference: <span className="font-mono font-medium text-[#231A1D]">{donation.reference}</span>
            </p>

            <div className="bg-[#FAF7F2] rounded-xl p-5 text-left mb-6 border border-[#EADBDA]">
              <h4 className="font-medium text-[#231A1D] mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#7B1E3A]" /> What happens next:
              </h4>
              <ul className="text-sm text-[#6E6259] space-y-2 list-disc list-inside">
                <li>The shelter will verify the payment in their UPI statement.</li>
                <li>You will see their confirmation on your status page.</li>
                <li>Pawfect never touches your funds; 100% went straight to the shelter.</li>
              </ul>
            </div>

            <Button onClick={() => navigate(`/donate/status/${donation.id}`)} variant="primary" className="w-full">
              View Donation Status
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-between">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-10 w-full">
        {/* Top Summary Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EADBDA] shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EADBDA] pb-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#6E6259]">Submitting Proof For</p>
              <h1 className="text-xl font-serif text-[#231A1D]">{donation.giftName}</h1>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-[#6E6259]">Amount Expected</p>
              <p className="text-2xl font-serif text-[#7B1E3A]">{formatRupees(donation.amountPaise)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-xs text-[#6E6259] block">Reference</span>
              <span className="font-mono text-[#231A1D] font-medium">{donation.reference}</span>
            </div>
            <div>
              <span className="text-xs text-[#6E6259] block">Shelter</span>
              <span className="text-[#231A1D] font-medium truncate block">{donation.shelterName}</span>
            </div>
            <div>
              <span className="text-xs text-[#6E6259] block">Attempt</span>
              <Badge variant="neutral">Attempt {windowCheck.attemptNumber} of 3</Badge>
            </div>
          </div>
        </div>

        {/* Stepper Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-medium text-[#6E6259] mb-2">
            <span className={step >= 1 ? 'text-[#7B1E3A] font-semibold' : ''}>1. Screenshot</span>
            <span className={step >= 2 ? 'text-[#7B1E3A] font-semibold' : ''}>2. Payment Details</span>
            <span className={step === 3 ? 'text-[#7B1E3A] font-semibold' : ''}>3. Review & Submit</span>
          </div>
          <div className="w-full bg-[#EADBDA] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#7B1E3A] h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#FBEBED] border border-[#E9A9B9] rounded-xl flex items-start gap-3 text-sm text-[#9A3B5A]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Submission Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Screenshot Upload */}
        {step === 1 && (
          <Card className="p-6">
            <h3 className="text-lg font-serif text-[#231A1D] mb-1">Upload Payment Screenshot</h3>
            <p className="text-sm text-[#6E6259] mb-6">
              Select or drop the success screen from your UPI app (GPay, PhonePe, Paytm, BHIM, etc.).
            </p>

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#C5B8B1] hover:border-[#7B1E3A] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#FAF7F2] mb-4"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
                <Upload className="w-10 h-10 text-[#7B1E3A] mx-auto mb-3" />
                <p className="font-medium text-[#231A1D] mb-1">Click to choose or drag screenshot here</p>
                <p className="text-xs text-[#6E6259]">JPG, PNG or WebP up to 5 MB</p>
              </div>
            ) : (
              <div className="border border-[#EADBDA] rounded-2xl p-4 bg-[#FAF7F2] mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-[#231A1D] truncate max-w-xs">{selectedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFileChange(null)}
                    className="text-xs text-[#9A3B5A] hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
                {previewUrl && (
                  <div className="rounded-xl overflow-hidden max-h-72 flex justify-center bg-black/5">
                    <img
                      src={previewUrl}
                      alt="Payment screenshot preview"
                      className="max-h-72 object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {fileError && <p className="text-xs text-[#9A3B5A] mb-4">{fileError}</p>}

            <div className="flex justify-between items-center mt-6">
              <Button onClick={() => navigate(`/donate/pay/${donation.id}`)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Payment
              </Button>
              <Button onClick={handleProceedToDetails} variant="primary" disabled={!selectedFile}>
                Continue to Details <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Payment Details */}
        {step === 2 && (
          <Card className="p-6">
            <h3 className="text-lg font-serif text-[#231A1D] mb-1">Enter Transaction Details</h3>
            <p className="text-sm text-[#6E6259] mb-6">
              Type the exact 12-digit UTR and amount from your UPI receipt.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="utr-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E6259] mb-1.5">
                  12-Digit UTR / Transaction ID <span className="text-[#9A3B5A]">*</span>
                </label>
                <input
                  id="utr-input"
                  type="text"
                  maxLength={12}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 412345678901"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#C5B8B1] focus:ring-2 focus:ring-[#7B1E3A] focus:outline-none font-mono text-base"
                />
                <p className="text-xs text-[#6E6259] mt-1">
                  You can find the 12-digit UTR in your payment app's history under Transaction Details.
                </p>
                {utrError && <p className="text-xs text-[#9A3B5A] mt-1">{utrError}</p>}
              </div>

              <div>
                <label htmlFor="amount-input" className="block text-xs font-semibold uppercase tracking-wider text-[#6E6259] mb-1.5">
                  Amount You Paid (₹) <span className="text-[#9A3B5A]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[#6E6259] font-serif">₹</span>
                  <input
                    id="amount-input"
                    type="number"
                    step="0.01"
                    min="1"
                    max="100000"
                    value={paidRupees}
                    onChange={(e) => setPaidRupees(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#C5B8B1] focus:ring-2 focus:ring-[#7B1E3A] focus:outline-none text-base"
                  />
                </div>
                {amountError && <p className="text-xs text-[#9A3B5A] mt-1">{amountError}</p>}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <Button onClick={() => setStep(1)} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleProceedToReview} variant="primary">
                Review & Confirm <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Review and Submit */}
        {step === 3 && (
          <Card className="p-6">
            <h3 className="text-lg font-serif text-[#231A1D] mb-1">Review Proof Submission</h3>
            <p className="text-sm text-[#6E6259] mb-6">
              Please verify your transaction number and amount before submitting.
            </p>

            <div className="bg-[#FAF7F2] rounded-xl p-5 border border-[#EADBDA] space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6259]">Gift:</span>
                <span className="font-medium text-[#231A1D]">{donation.giftName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6259]">Shelter:</span>
                <span className="font-medium text-[#231A1D]">{donation.shelterName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6259]">12-Digit UTR:</span>
                <span className="font-mono font-medium text-[#231A1D]">{utr}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6259]">Amount you paid:</span>
                <span className="font-serif font-medium text-[#7B1E3A] text-lg">₹{paidRupees}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6E6259]">Screenshot:</span>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedFile?.name} (Verified)
                </span>
              </div>
            </div>

            <div className="bg-[#FAF7F2] rounded-xl p-4 border border-[#EADBDA] mb-6 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#7B1E3A] shrink-0 mt-0.5" />
              <p className="text-xs text-[#6E6259] leading-relaxed">
                Pawfect never holds your money. The shelter will check that your payment arrived.
              </p>
            </div>

            {submitting && (
              <div className="mb-6 p-4 bg-[#F3E3E8] rounded-xl text-center">
                <div className="w-6 h-6 border-2 border-[#7B1E3A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium text-[#7B1E3A]">
                  {submitProgress === 'processing'
                    ? 'Sanitizing image & stripping metadata...'
                    : submitProgress === 'uploading'
                    ? 'Uploading securely...'
                    : 'Saving proof records...'}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
              <Button onClick={() => setStep(2)} variant="outline" disabled={submitting}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleSubmit} variant="primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Payment Proof'}
              </Button>
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
