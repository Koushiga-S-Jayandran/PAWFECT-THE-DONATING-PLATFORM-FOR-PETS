import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { authGateway, donationLifecycleService } from '../../app/container.js';
import type { Donation } from '../../domain/donationEntities.js';
import { formatRupees } from '../../utils/money.js';
import { formatFriendlyDate } from '../../utils/dateUtils.js';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Gift,
  Building2,
  CreditCard,
  ArrowRight,
} from 'lucide-react';

export const DonationStatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const currentUser = authGateway.getCurrentUser();

  const [donation, setDonation] = useState<Donation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    donationLifecycleService
      .getDonation(id, currentUser?.uid)
      .then((d) => setDonation(d))
      .catch(() => {})
      .finally(() => setIsLoadingPretty());

    function setIsLoadingPretty() {
      setIsLoading(false);
    }
  }, [id, currentUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
        <Header />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
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
            <h1 className="font-heading text-xl font-medium">Donation Not Found</h1>
            <p className="text-xs text-[#6B5B61]">Could not find donation with identifier "{id}".</p>
            <Link to="/gifts">
              <Button variant="primary" size="md">Browse Gifts</Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
          <Card padding="lg" className="shadow-xs space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-[#E7DEDF] pb-4">
              <div>
                <span className="text-[11px] font-semibold text-[#6B5B61] uppercase tracking-wider block">
                  Donation Reference
                </span>
                <span className="font-mono text-base font-bold text-[#7B1E3A]">
                  {donation.reference}
                </span>
              </div>

              <div>
                {donation.status === 'PENDING' && (
                  <Badge variant="warning" className="gap-1 py-1 px-3">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pending UPI Transfer</span>
                  </Badge>
                )}
                {donation.status === 'CANCELLED' && (
                  <Badge variant="neutral" className="gap-1 py-1 px-3">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancelled</span>
                  </Badge>
                )}
                {donation.status === 'EXPIRED' && (
                  <Badge variant="primary" className="gap-1 py-1 px-3 bg-[#B4423A] text-white">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Expired Window</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Receipt Summary */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E7DEDF]/60">
                <span className="text-[#6B5B61]">Gift Item:</span>
                <span className="font-semibold text-[#231A1D]">{donation.giftName} (×{donation.quantity})</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7DEDF]/60">
                <span className="text-[#6B5B61]">Total Amount:</span>
                <span className="font-bold text-[#7B1E3A] text-sm">{formatRupees(donation.amountPaise)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7DEDF]/60">
                <span className="text-[#6B5B61]">Receiving Shelter:</span>
                <span className="font-medium text-[#231A1D]">{donation.shelterName} ({donation.shelterDistrict})</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7DEDF]/60">
                <span className="text-[#6B5B61]">Shelter UPI ID:</span>
                <span className="font-mono font-medium text-[#231A1D]">{donation.shelterUpiId}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#E7DEDF]/60">
                <span className="text-[#6B5B61]">Created At:</span>
                <span className="text-[#231A1D]">{formatFriendlyDate(donation.createdAt)}</span>
              </div>

              {donation.statusReason && (
                <div className="flex justify-between py-1 border-b border-[#E7DEDF]/60">
                  <span className="text-[#6B5B61]">Status Note:</span>
                  <span className="text-[#6B5B61] italic">{donation.statusReason}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-wrap gap-3">
              {donation.status === 'PENDING' && (
                <Link to={`/donate/pay/${donation.id}`} className="flex-1">
                  <Button variant="primary" size="md" className="w-full justify-center gap-1.5">
                    <span>Back to Payment QR</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}

              <Link to="/my-donations" className="flex-1">
                <Button variant="outline" size="md" className="w-full justify-center">
                  View All My Gifts
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};
