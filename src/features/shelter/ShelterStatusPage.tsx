import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  shelterReader,
  shelterRegistrationService,
  authGateway,
} from '../../app/container.js';
import type { Shelter, ShelterPrivate } from '../../domain/shelterEntities.js';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { SHELTER_ROUTES } from '../../config/shelterRoutes.js';
import { getRegionByCode } from '../../config/regions.js';
import { getAnimalTypeLabel } from '../../config/animalTypes.js';
import { URGENCY_LEVELS, type UrgencyLevelId } from '../../config/urgencyLevels.js';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Building2,
  Edit3,
  RotateCw,
} from 'lucide-react';

export const ShelterStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [privateData, setPrivateData] = useState<ShelterPrivate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable urgency state for APPROVED status
  const [urgency, setUrgency] = useState<UrgencyLevelId>('NORMAL');
  const [urgencyNote, setUrgencyNote] = useState('');
  const [isUpdatingUrgency, setIsUpdatingUrgency] = useState(false);
  const [urgencyUpdateSuccess, setUrgencyUpdateSuccess] = useState(false);

  const currentUser = authGateway.getCurrentUser();

  const loadData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await shelterReader.getShelterByOwner(currentUser.uid);
      setShelter(res.shelter);
      setPrivateData(res.privateData);
      if (res.shelter) {
        setUrgency(res.shelter.urgency);
        setUrgencyNote(res.shelter.urgencyNote || '');
      }
    } catch (err: any) {
      setError('Unable to load shelter status. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleUpdateUrgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelter) return;
    setIsUpdatingUrgency(true);
    setUrgencyUpdateSuccess(false);
    try {
      await shelterRegistrationService.updateUrgency({
        ownerId: shelter.ownerId,
        urgency,
        urgencyNote,
      });
      setUrgencyUpdateSuccess(true);
      setTimeout(() => setUrgencyUpdateSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update urgency details.');
    } finally {
      setIsUpdatingUrgency(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl text-left">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B1E3A] border-t-transparent" />
              <p className="text-xs text-[#6B5B61]">Loading shelter details...</p>
            </div>
          ) : !shelter ? (
            <Card padding="lg" className="text-center shadow-xs space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E3E8] text-[#7B1E3A]">
                <Building2 className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-medium text-[#231A1D]">
                  No shelter registered yet
                </h1>
                <p className="mt-1 text-sm text-[#6B5B61]">
                  If you run an animal shelter in Tamil Nadu or Kerala, register to receive verified direct UPI donations.
                </p>
              </div>
              <div className="pt-2">
                <Link to={SHELTER_ROUTES.REGISTER}>
                  <Button variant="primary" size="md">
                    Register your shelter
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-[#7B1E3A] uppercase tracking-wider">
                    Shelter Ownership Portal
                  </span>
                  <h1 className="font-heading text-3xl font-medium text-[#231A1D]">
                    {shelter.name}
                  </h1>
                </div>

                {/* Status Badge */}
                <div>
                  {shelter.status === 'PENDING' && (
                    <Badge variant="warning" className="gap-1.5 py-1 px-3">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Pending Verification</span>
                    </Badge>
                  )}
                  {shelter.status === 'APPROVED' && (
                    <Badge variant="success" className="gap-1.5 py-1 px-3">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approved & Verified</span>
                    </Badge>
                  )}
                  {shelter.status === 'REJECTED' && (
                    <Badge variant="primary" className="gap-1.5 py-1 px-3">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Rejected (Action Required)</span>
                    </Badge>
                  )}
                  {shelter.status === 'SUSPENDED' && (
                    <Badge variant="warning" className="gap-1.5 py-1 px-3">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Temporarily Suspended</span>
                    </Badge>
                  )}
                  {shelter.status === 'REMOVED' && (
                    <Badge variant="neutral" className="gap-1.5 py-1 px-3">
                      <Ban className="h-3.5 w-3.5" />
                      <span>Removed</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status Specific Message & Actions */}
              {shelter.status === 'PENDING' && (
                <div
                  role="region"
                  className="rounded-2xl border border-[#B7791F]/30 bg-[#B7791F]/10 p-5 text-sm text-[#915f16] flex items-start gap-3.5"
                >
                  <Clock className="h-5 w-5 shrink-0 mt-0.5 text-[#B7791F]" />
                  <div className="leading-relaxed">
                    <p className="font-semibold text-base">Under Review</p>
                    <p className="mt-1 text-xs">
                      Your shelter is under review. Donors cannot see it until an admin approves it. Our team will verify your phone number and registration details.
                    </p>
                  </div>
                </div>
              )}

              {shelter.status === 'REJECTED' && (
                <div
                  role="alert"
                  className="rounded-2xl border border-[#B4423A]/30 bg-[#B4423A]/10 p-5 text-sm text-[#B4423A] space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-[#B4423A]" />
                    <div>
                      <p className="font-semibold text-base">Verification Needs Attention</p>
                      <p className="mt-1 text-xs leading-relaxed">
                        Reason from reviewer: <strong className="text-[#231A1D]">{privateData?.statusReason || 'Please fix the indicated details.'}</strong>
                      </p>
                      <p className="mt-1 text-xs text-[#6B5B61]">
                        Resubmissions used: {shelter.resubmitCount} of 3
                      </p>
                    </div>
                  </div>

                  {shelter.resubmitCount < 3 ? (
                    <div className="pt-2 border-t border-[#B4423A]/20">
                      <Link to={SHELTER_ROUTES.REGISTER}>
                        <Button variant="primary" size="sm" className="gap-2">
                          <RotateCw className="h-4 w-4" />
                          <span>Fix and resubmit ({3 - shelter.resubmitCount} tries left)</span>
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-xs text-[#B4423A] font-medium">
                      Maximum resubmission limit reached. Please contact Pawfect support for manual review.
                    </p>
                  )}
                </div>
              )}

              {shelter.status === 'SUSPENDED' && (
                <div
                  role="alert"
                  className="rounded-2xl border border-[#B7791F]/30 bg-[#B7791F]/10 p-5 text-sm text-[#915f16] flex items-start gap-3"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-[#B7791F]" />
                  <div>
                    <p className="font-semibold text-base">Shelter Temporarily Suspended</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      Reason: <strong className="text-[#231A1D]">{privateData?.statusReason || 'Pending administrative clarification.'}</strong>
                    </p>
                    <p className="mt-1 text-xs text-[#6B5B61]">
                      Donors cannot view this shelter during suspension. Please contact Pawfect support.
                    </p>
                  </div>
                </div>
              )}

              {shelter.status === 'REMOVED' && (
                <div
                  role="alert"
                  className="rounded-2xl border border-[#E7DEDF] bg-[#FAF7F2] p-5 text-sm text-[#6B5B61] flex items-start gap-3"
                >
                  <Ban className="h-5 w-5 shrink-0 mt-0.5 text-[#6B5B61]" />
                  <div>
                    <p className="font-semibold text-base text-[#231A1D]">Shelter Removed</p>
                    <p className="mt-1 text-xs">
                      This shelter has been removed. Contact support.
                    </p>
                  </div>
                </div>
              )}

              {/* Read-Only Shelter Overview */}
              <Card padding="md" className="shadow-xs space-y-4">
                <h2 className="text-base font-semibold text-[#231A1D] flex items-center justify-between">
                  <span>Shelter Profile Information</span>
                  <span className="text-xs font-normal text-[#6B5B61]">
                    Status Version {shelter.statusVersion}
                  </span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#6B5B61]">Location:</span>
                    <p className="font-medium text-[#231A1D]">
                      {shelter.area}, {shelter.district},{' '}
                      {getRegionByCode(shelter.stateCode)?.name}
                    </p>
                  </div>

                  <div>
                    <span className="text-[#6B5B61]">Animals Cared For:</span>
                    <p className="font-medium text-[#231A1D]">
                      {shelter.animalTypes.map(getAnimalTypeLabel).join(', ')}
                    </p>
                  </div>

                  <div>
                    <span className="text-[#6B5B61]">Contact Person:</span>
                    <p className="font-medium text-[#231A1D]">
                      {privateData?.contactPerson || '—'} ({privateData?.phone || '—'})
                    </p>
                  </div>

                  <div>
                    <span className="text-[#6B5B61]">Shelter UPI:</span>
                    <p className="font-medium text-[#231A1D]">
                      {privateData?.upiId || '—'} ({privateData?.upiHolderName || '—'})
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E7DEDF] pt-3 text-xs">
                  <span className="text-[#6B5B61]">Description:</span>
                  <p className="mt-1 text-[#231A1D] leading-relaxed">
                    {shelter.description}
                  </p>
                </div>

                {shelter.status === 'APPROVED' && (
                  <p className="text-xs text-[#6B5B61] italic pt-1">
                    To change other details, contact Pawfect support. Editing arrives in a later update.
                  </p>
                )}
              </Card>

              {/* Editable Urgency Level (Only for APPROVED status) */}
              {shelter.status === 'APPROVED' && (
                <Card padding="md" className="shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-[#7B1E3A]" />
                    <h2 className="text-base font-semibold text-[#231A1D]">
                      Live Urgency Level
                    </h2>
                  </div>
                  <p className="text-xs text-[#6B5B61]">
                    Shelter owners can update their urgency status at any time without waiting for admin re-approval.
                  </p>

                  {urgencyUpdateSuccess && (
                    <div
                      role="status"
                      className="rounded-xl border border-[#2E7D5B]/30 bg-[#2E7D5B]/10 p-3 text-xs text-[#2E7D5B]"
                    >
                      Urgency details updated successfully.
                    </div>
                  )}

                  <form onSubmit={handleUpdateUrgency} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#231A1D]">
                        Urgency Status
                      </label>
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value as UrgencyLevelId)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-[#E7DEDF] bg-white px-3.5 py-2.5 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                      >
                        {URGENCY_LEVELS.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label} — {u.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-[#231A1D]">
                          Urgency Note (0 - 140 chars)
                        </label>
                        <span className="text-xs text-[#6B5B61]">
                          {urgencyNote.length}/140
                        </span>
                      </div>
                      <input
                        type="text"
                        value={urgencyNote}
                        onChange={(e) => setUrgencyNote(e.target.value.slice(0, 140))}
                        placeholder="e.g. Critical food shortage for 40 dogs after monsoon"
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-[#E7DEDF] bg-white px-3.5 py-2.5 text-sm text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        size="md"
                        isLoading={isUpdatingUrgency}
                        disabled={isUpdatingUrgency}
                      >
                        Save urgency update
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};
