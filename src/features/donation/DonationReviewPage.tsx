import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { formatRupees } from '../../utils/money.js';
import { authGateway, donationCreationService } from '../../app/container.js';
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  Gift,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Lock,
} from 'lucide-react';

export const DonationReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authGateway.getCurrentUser();

  const [draft, setDraft] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('pawfect_donation_draft');
    if (!raw) {
      navigate('/gifts', { replace: true });
      return;
    }
    try {
      setDraft(JSON.parse(raw));
    } catch {
      navigate('/gifts', { replace: true });
    }
  }, [navigate]);

  if (!draft) {
    return null;
  }

  const handleConfirmAndPay = async () => {
    if (!currentUser) {
      setErrorMessage('Please sign in to proceed with this gift.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await donationCreationService.createDonation({
        donorUid: currentUser.uid,
        donorName: currentUser.displayName || 'Kind Donor',
        donorEmail: currentUser.email || '',
        shelterId: draft.shelterId,
        giftId: draft.giftId,
        quantity: draft.quantity,
        customAmountRupees: draft.customAmountRupees,
        donorNote: draft.donorNote,
        dedicationName: draft.dedicationName,
        dedicationMessage: draft.dedicationMessage,
      });

      // Clear draft
      sessionStorage.removeItem('pawfect_donation_draft');

      // Navigate to Pay screen
      navigate(`/donate/pay/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not create donation record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="border-b border-[#E7DEDF] bg-white py-4">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Link
              to={`/donate/${draft.giftId}?shelterId=${draft.shelterId}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B5B61] hover:text-[#231A1D]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Edit Gift</span>
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
          <div className="space-y-6 text-left">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#F3E3E8] px-3.5 py-1 text-xs font-semibold text-[#7B1E3A] mb-3">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Review & Confirm</span>
              </div>
              <h1 className="font-heading text-3xl font-medium text-[#231A1D]">
                Confirm Your Gift
              </h1>
              <p className="mt-1 text-xs text-[#6B5B61]">
                Please review your gift details. Next, you will scan the shelter’s verified UPI QR code to complete payment.
              </p>
            </div>

            {errorMessage && (
              <div role="alert" className="rounded-xl border border-[#B4423A]/30 bg-[#B4423A]/10 p-4 text-xs font-medium text-[#B4423A] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Gift Summary Card */}
            <Card padding="lg" className="shadow-xs space-y-6">
              {/* Gift Item */}
              <div className="flex items-start justify-between border-b border-[#E7DEDF] pb-5">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#7B1E3A] uppercase tracking-wider block">
                    Gift Item
                  </span>
                  <h2 className="font-heading text-xl font-medium text-[#231A1D]">
                    {draft.giftName}
                  </h2>
                  <p className="text-xs text-[#6B5B61]">
                    Quantity: <strong>{draft.quantity}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#6B5B61] block">Total Value</span>
                  <span className="font-heading text-2xl font-bold text-[#7B1E3A]">
                    {formatRupees(draft.totalAmountPaise)}
                  </span>
                </div>
              </div>

              {/* Receiving Shelter */}
              <div className="space-y-2 border-b border-[#E7DEDF] pb-5">
                <span className="text-[11px] font-semibold text-[#7B1E3A] uppercase tracking-wider block">
                  Receiving Shelter
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-[#231A1D] text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#7B1E3A]" />
                      <span>{draft.shelterName}</span>
                    </h3>
                    <p className="text-xs text-[#6B5B61] mt-0.5">
                      Location: {draft.shelterDistrict}, {draft.shelterState}
                    </p>
                  </div>
                  <Badge variant="success" className="py-1 px-3 gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified Shelter</span>
                  </Badge>
                </div>
              </div>

              {/* Dedication or Note if Present */}
              {(draft.dedicationName || draft.donorNote) && (
                <div className="space-y-3 border-b border-[#E7DEDF] pb-5 text-xs">
                  <span className="text-[11px] font-semibold text-[#7B1E3A] uppercase tracking-wider block">
                    Dedication & Message
                  </span>
                  {draft.dedicationName && (
                    <div className="rounded-xl bg-[#FAF7F2] p-3 border border-[#E7DEDF]">
                      <span className="font-semibold text-[#231A1D]">Dedicated to:</span> {draft.dedicationName}
                      {draft.dedicationMessage && (
                        <p className="mt-1 italic text-[#6B5B61]">"{draft.dedicationMessage}"</p>
                      )}
                    </div>
                  )}
                  {draft.donorNote && (
                    <p className="text-[#6B5B61]">
                      <strong>Note to Caretakers:</strong> {draft.donorNote}
                    </p>
                  )}
                </div>
              )}

              {/* Transparency Breakdown */}
              <div className="rounded-2xl bg-[#FAF7F2] p-4 text-xs space-y-2 border border-[#E7DEDF]">
                <div className="flex justify-between">
                  <span className="text-[#6B5B61]">Gift Subtotal:</span>
                  <span className="font-medium text-[#231A1D]">{formatRupees(draft.totalAmountPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B5B61]">Pawfect Platform Fee:</span>
                  <span className="font-semibold text-[#2E7D5B]">₹0.00 (100% Free Spark)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B5B61]">Payment Method:</span>
                  <span className="font-medium text-[#231A1D]">Direct UPI to Shelter</span>
                </div>
                <div className="border-t border-[#E7DEDF] pt-2 flex justify-between font-bold text-sm text-[#231A1D]">
                  <span>Total Amount to Pay:</span>
                  <span className="text-[#7B1E3A]">{formatRupees(draft.totalAmountPaise)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-3">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={handleConfirmAndPay}
                  className="w-full justify-center gap-2 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Generating Secure Payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Proceed to UPI Payment</span>
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] text-[#6B5B61]">
                  By proceeding, a unique donation record and reference code will be generated.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
