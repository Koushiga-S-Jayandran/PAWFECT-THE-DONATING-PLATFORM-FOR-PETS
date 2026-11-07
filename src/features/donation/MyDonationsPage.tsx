import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Gift,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const MyDonationsPage: React.FC = () => {
  const currentUser = authGateway.getCurrentUser();
  const [donations, setDonations] = useState<readonly Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      donationLifecycleService
        .getDonationsForDonor(currentUser.uid)
        .then((list) => setDonations(list))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [currentUser]);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl font-medium text-[#231A1D]">
                  My Gifts & Donations
                </h1>
                <p className="text-xs text-[#6B5B61] mt-1">
                  Track the meals, medicines, and shelter supplies you have gifted.
                </p>
              </div>

              <Link to="/gifts">
                <Button variant="primary" size="md" className="gap-1.5 text-xs font-semibold">
                  <Gift className="h-4 w-4" />
                  <span>Send a Gift</span>
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
              </div>
            ) : donations.length === 0 ? (
              <Card padding="lg" className="text-center py-12 space-y-4 shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E3E8] text-[#7B1E3A]">
                  <Gift className="h-7 w-7" />
                </div>
                <h2 className="font-heading text-xl font-medium text-[#231A1D]">
                  No gifts sent yet
                </h2>
                <p className="text-xs text-[#6B5B61] max-w-md mx-auto">
                  You haven’t gifted any supplies to animal shelters yet. Every wholesome meal or medicine dose directly saves lives.
                </p>
                <div className="pt-2">
                  <Link to="/gifts">
                    <Button variant="primary" size="md">
                      Browse Gift Catalog
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {donations.map((item) => (
                  <Card
                    key={item.id}
                    padding="md"
                    className="shadow-xs hover:border-[#7B1E3A]/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#7B1E3A]">
                            {item.reference}
                          </span>
                          <span className="text-[#C4B5B8]">•</span>
                          <span className="text-xs text-[#6B5B61]">
                            {formatFriendlyDate(item.createdAt)}
                          </span>
                        </div>

                        <h3 className="font-heading text-lg font-medium text-[#231A1D]">
                          {item.giftName} {item.quantity > 1 && `(×${item.quantity})`}
                        </h3>

                        <p className="text-xs text-[#6B5B61] flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-[#7B1E3A]" />
                          <span>{item.shelterName} ({item.shelterDistrict}, {item.shelterState})</span>
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                        <span className="font-heading text-xl font-bold text-[#7B1E3A]">
                          {formatRupees(item.amountPaise)}
                        </span>

                        <div className="flex items-center gap-2">
                          {item.status === 'PENDING' && (
                            <Link to={`/donate/pay/${item.id}`}>
                              <Badge variant="warning" className="cursor-pointer gap-1 py-1 px-2.5">
                                <Clock className="h-3 w-3" />
                                <span>Pay Now</span>
                              </Badge>
                            </Link>
                          )}

                          {item.status === 'CANCELLED' && (
                            <Badge variant="neutral" className="py-1 px-2.5">
                              Cancelled
                            </Badge>
                          )}

                          {item.status === 'EXPIRED' && (
                            <Badge variant="primary" className="py-1 px-2.5 bg-[#B4423A] text-white">
                              Expired
                            </Badge>
                          )}

                          <Link to={`/donate/status/${item.id}`}>
                            <Button variant="outline" size="sm" className="text-xs gap-1 px-2.5 py-1">
                              <span>Details</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
