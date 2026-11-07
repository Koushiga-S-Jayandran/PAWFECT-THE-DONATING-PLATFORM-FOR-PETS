import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { authGateway, donationLifecycleService } from '../../app/container.js';
import type { Donation } from '../../domain/donationEntities.js';
import { formatRupees } from '../../utils/money.js';
import { getRemainingSeconds, formatRemainingTime, isDonationExpired } from '../../utils/dateUtils.js';
import {
  Copy,
  Check,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Building2,
  XCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

export const DonationPayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = authGateway.getCurrentUser();

  const [donation, setDonation] = useState<Donation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Fetch donation details
  const fetchDonation = async () => {
    if (!id) return;
    try {
      const data = await donationLifecycleService.getDonation(id, currentUser?.uid);
      setDonation(data);
      if (data) {
        setRemainingSeconds(getRemainingSeconds(data.expiresAt));
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load payment details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonation();
  }, [id, currentUser]);

  // 2. Render UPI QR code onto canvas
  useEffect(() => {
    if (donation && canvasRef.current && donation.status === 'PENDING') {
      QRCode.toCanvas(canvasRef.current, donation.upiIntentUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#231A1D',
          light: '#FFFFFF',
        },
      }).catch((err) => {
        console.warn('QR Code generation failed:', err);
      });
    }
  }, [donation]);

  // 3. Countdown timer tick
  useEffect(() => {
    if (!donation || donation.status !== 'PENDING') return;

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(donation.expiresAt);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        fetchDonation(); // triggers auto-expiry
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [donation]);

  const handleCopyUpi = () => {
    if (!donation) return;
    navigator.clipboard.writeText(donation.shelterUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleOpenUpiApp = () => {
    if (!donation) return;
    // Direct mobile app intent
    window.location.href = donation.upiIntentUrl;
  };

  const handleCancelDonation = async () => {
    if (!donation || !currentUser) return;
    setIsCancelling(true);
    try {
      await donationLifecycleService.cancelDonation(
        donation.id,
        currentUser.uid,
        cancelReason || 'Cancelled by donor'
      );
      setCancelModalOpen(false);
      fetchDonation();
    } catch (err: any) {
      setError(err?.message || 'Could not cancel donation.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
            <p className="text-xs text-[#6B5B61]">Preparing UPI payment portal...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <Card padding="lg" className="max-w-md text-center space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-[#B7791F]" />
            <h1 className="font-heading text-2xl font-medium">Donation Not Found</h1>
            <p className="text-xs text-[#6B5B61]">This donation record does not exist or you do not have permission to view it.</p>
            <Link to="/gifts">
              <Button variant="primary" size="md">Browse Gifts</Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const isExpired = donation.status === 'EXPIRED' || (donation.status === 'PENDING' && isDonationExpired(donation.expiresAt));
  const isCancelled = donation.status === 'CANCELLED';

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
          <div className="space-y-6 text-left">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#7B1E3A] bg-[#F3E3E8] px-3 py-1 rounded-full">
                  Ref: {donation.reference}
                </span>

                {donation.status === 'PENDING' && !isExpired && (
                  <div className="flex items-center gap-1.5 rounded-full bg-[#FAF0E6] px-3 py-1 text-xs font-semibold text-[#8C4A00] border border-[#8C4A00]/20">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Expires in {formatRemainingTime(remainingSeconds)}</span>
                  </div>
                )}

                {donation.status === 'CANCELLED' && (
                  <Badge variant="neutral" className="py-1 px-3">
                    Cancelled
                  </Badge>
                )}

                {isExpired && (
                  <Badge variant="primary" className="py-1 px-3 bg-[#B4423A] text-white">
                    Expired
                  </Badge>
                )}
              </div>

              <h1 className="font-heading text-3xl font-medium text-[#231A1D]">
                Complete Your UPI Payment
              </h1>
              <p className="text-xs text-[#6B5B61] mt-1">
                Scan the QR code with Google Pay, PhonePe, Paytm, BHIM, or any bank UPI app.
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-[#B4423A]/30 bg-[#B4423A]/10 p-4 text-xs font-medium text-[#B4423A]">
                {error}
              </div>
            )}

            {/* Cancelled or Expired Notice */}
            {(isCancelled || isExpired) && (
              <div className="rounded-2xl border border-[#E7DEDF] bg-white p-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F2] text-[#6B5B61]">
                  <XCircle className="h-6 w-6 text-[#B4423A]" />
                </div>
                <h2 className="font-heading text-xl font-medium text-[#231A1D]">
                  {isCancelled ? 'Donation Cancelled' : 'Donation Window Expired'}
                </h2>
                <p className="text-xs text-[#6B5B61] max-w-md mx-auto">
                  {isCancelled
                    ? 'You cancelled this donation request. No funds were debited by Pawfect.'
                    : 'This 30-minute donation window has passed to protect current shelter need and pricing.'}
                </p>
                <div className="pt-2">
                  <Link to="/gifts">
                    <Button variant="primary" size="md">
                      Choose a New Gift
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Active Payment Card */}
            {donation.status === 'PENDING' && !isExpired && (
              <Card padding="lg" className="shadow-sm space-y-6 text-center">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-[#E7DEDF]">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-[#E7DEDF]/80">
                    <canvas ref={canvasRef} className="mx-auto" />
                  </div>

                  <p className="mt-3 text-[11px] font-semibold text-[#6B5B61] uppercase tracking-wider">
                    Scan with any UPI App
                  </p>
                </div>

                {/* Amount to Pay */}
                <div className="rounded-2xl bg-[#FAF7F2] p-4 text-center border border-[#E7DEDF]">
                  <span className="text-xs text-[#6B5B61] block mb-1">Exact Amount to Pay:</span>
                  <span className="font-heading text-3xl font-bold text-[#7B1E3A]">
                    {formatRupees(donation.amountPaise)}
                  </span>
                  <span className="text-[11px] text-[#2E7D5B] font-medium block mt-1">
                    100% direct to verified shelter • 0% platform deduction
                  </span>
                </div>

                {/* Direct Mobile UPI Intent Button */}
                <div>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleOpenUpiApp}
                    className="w-full justify-center gap-2 font-semibold text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Pay via UPI App (Mobile)</span>
                  </Button>
                  <p className="text-[11px] text-[#6B5B61] mt-1.5">
                    Tapping on mobile opens Google Pay, PhonePe, Paytm, or BHIM directly with the exact amount.
                  </p>
                </div>

                {/* Payee UPI ID Copy Card */}
                <div className="rounded-xl border border-[#E7DEDF] bg-white p-4 text-left space-y-2">
                  <span className="text-[11px] font-semibold text-[#6B5B61] uppercase tracking-wider block">
                    Shelter UPI Details
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate">
                      <span className="text-xs font-bold text-[#231A1D] block">
                        {donation.shelterPayeeName}
                      </span>
                      <span className="font-mono text-xs text-[#7B1E3A] truncate block">
                        {donation.shelterUpiId}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUpi}
                      className="gap-1.5 text-xs shrink-0"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#2E7D5B]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy UPI ID</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Verification Notice */}
                <div className="flex items-start gap-2.5 rounded-xl bg-[#F3E3E8]/40 p-3.5 text-left text-xs text-[#7B1E3A]">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Once you pay in your UPI app, please keep your UPI Ref/UTR number handy. The shelter receives funds instantly.
                  </p>
                </div>

                {/* Status & Cancel Actions */}
                <div className="pt-4 border-t border-[#E7DEDF] flex items-center justify-between text-xs">
                  <Link
                    to={`/donate/status/${donation.id}`}
                    className="font-medium text-[#7B1E3A] hover:underline"
                  >
                    Check Status Tracker
                  </Link>

                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="text-[#B4423A] hover:underline cursor-pointer font-medium"
                  >
                    Cancel this donation
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 text-left">
            <h3 className="font-heading text-lg font-medium text-[#231A1D]">
              Cancel this donation?
            </h3>
            <p className="text-xs text-[#6B5B61]">
              If you have not yet completed the UPI transfer, you can cancel this request anytime.
            </p>

            <div>
              <label htmlFor="cancel-reason" className="block text-xs font-medium text-[#6B5B61] mb-1">
                Reason (optional)
              </label>
              <input
                id="cancel-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Changed my mind or selected wrong gift"
                className="w-full rounded-xl border border-[#E7DEDF] p-2.5 text-xs text-[#231A1D]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={isCancelling}
                onClick={() => setCancelModalOpen(false)}
              >
                Keep Active
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={isCancelling}
                onClick={handleCancelDonation}
                className="bg-[#B4423A] hover:bg-[#963730]"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
