import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit3,
  HeartHandshake,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.js';
import { ROUTES } from '../../../config/constants.js';
import {
  LISTING_STATUS,
  LISTING_STATUS_LABELS,
} from '../../../config/adoptionListingConfig.js';
import type {
  AdoptionInterestRequest,
  AdoptionListing,
} from '../../../domain/adoptionListingEntities.js';
import { evaluateListingInactivity } from '../../../domain/listingLifecycle.js';
import { adoptionListingService } from '../../../services/AdoptionListingService.js';
import { adoptionInterestService } from '../../../services/AdoptionInterestService.js';

export const MyListingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [requests, setRequests] = useState<AdoptionInterestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const [ownerListings, ownerRequests] = await Promise.all([
        adoptionListingService.processInactivityForOwner(user.uid),
        adoptionInterestService.getRequestsForLister(user.uid),
      ]);
      setListings(ownerListings);
      setRequests(ownerRequests);
    } catch (err: any) {
      setError(err?.message || 'Could not load your listings.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleStatusChange = async (
    listingId: string,
    toStatus: 'adopted' | 'on_hold' | 'approved'
  ) => {
    if (!user?.uid) return;
    setBusyId(listingId);
    setError(null);
    try {
      await adoptionListingService.changeListerStatus({
        listingId,
        actorUid: user.uid,
        toStatus,
      });
      showToast(
        toStatus === 'adopted'
          ? 'Marked Adopted! Moved to Happy Tails.'
          : toStatus === 'on_hold'
          ? 'Listing placed On Hold.'
          : 'Listing resumed and live again.'
      );
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Status update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRenew = async (listingId: string) => {
    if (!user?.uid) return;
    setBusyId(listingId);
    try {
      await adoptionListingService.renewListingActivity(listingId, user.uid);
      showToast('Listing activity confirmed for another 60 days.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Renewal failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!user?.uid) return;
    setBusyId(listingId);
    try {
      await adoptionListingService.deleteListing(listingId, user.uid);
      setConfirmDeleteId(null);
      showToast('Listing deleted.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Could not delete listing.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecision = async (
    request: AdoptionInterestRequest,
    decision: 'approved' | 'rejected'
  ) => {
    if (!user?.uid) return;
    setBusyId(request.id);
    setError(null);
    try {
      await adoptionInterestService.decideInterest({
        request,
        listerUid: user.uid,
        decision,
      });
      showToast(
        decision === 'approved'
          ? `Accepted ${request.adopterName}. Your contact number is now visible to them.`
          : `Declined ${request.adopterName}'s inquiry.`
      );
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update inquiry.');
    } finally {
      setBusyId(null);
    }
  };

  const statusTone = (status: AdoptionListing['status']) => {
    switch (status) {
      case 'approved':
        return 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300';
      case 'pending':
        return 'border-amber-500/40 bg-amber-950/60 text-amber-200';
      case 'changes_requested':
        return 'border-orange-500/40 bg-orange-950/60 text-orange-200';
      case 'rejected':
        return 'border-rose-500/40 bg-rose-950/60 text-rose-200';
      case 'on_hold':
        return 'border-[#6A4A57] bg-[#251E21] text-[#CBBBC2]';
      case 'adopted':
        return 'border-emerald-400/50 bg-emerald-900/40 text-emerald-200';
      case 'expired_hidden':
        return 'border-rose-400/40 bg-rose-950/40 text-rose-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#110E10] text-[#F6F0EC] flex flex-col">
      <header className="border-b border-[#2D2328] bg-[#161114]/95 sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            to={ROUTES.PETS}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#CBBBC2] hover:text-[#F6F0EC]"
          >
            <ArrowLeft className="h-4 w-4" /> Browse Adoption Portal
          </Link>

          <Link
            to={ROUTES.LIST_ANIMAL}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#7B1E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#932547]"
          >
            <Plus className="h-4 w-4" /> List an animal
          </Link>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className="fixed top-16 right-4 z-50 rounded-xl border border-emerald-500/40 bg-emerald-950 px-4 py-2.5 text-xs font-semibold text-emerald-200 shadow-lg"
        >
          {toast}
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E2B75B]">
            Lister Workspace
          </span>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#F6F0EC]">
            My Adoption Listings
          </h1>
          <p className="mt-1 text-sm text-[#B8A8AE]">
            Track review statuses, edit profiles, respond to interested adopters, or mark pets as Adopted for Happy Tails.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-500/40 bg-rose-950/50 p-4 text-xs text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#D94F73]" />
            <p className="mt-3 text-sm text-[#B8A8AE]">Loading your listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#382D32] bg-[#1B1618] p-12 text-center">
            <h2 className="font-serif text-xl font-bold text-[#F6F0EC]">
              No animals listed yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#B8A8AE]">
              When you list an animal for adoption across Tamil Nadu or Kerala, you can track approvals and review adopter inquiries here.
            </p>
            <Link
              to={ROUTES.LIST_ANIMAL}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#932547]"
            >
              <Plus className="h-4 w-4" /> List an animal
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {listings.map((item) => {
              const itemRequests = requests.filter((r) => r.listingId === item.id || r.petId === item.id);
              const pendingReqCount = itemRequests.filter((r) => r.status === 'pending').length;
              const inactivity = evaluateListingInactivity(item);
              const isExpanded = expandedListingId === item.id;

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-[#382D32] bg-[#1B1618] p-5 sm:p-6 shadow-lg"
                >
                  <div className="flex flex-col md:flex-row gap-5">
                    {/* Thumbnail */}
                    <div className="h-36 w-full md:w-48 shrink-0 overflow-hidden rounded-2xl bg-[#110E10] border border-[#2D2328]">
                      {item.photos[0] ? (
                        <img
                          src={item.photos[0]}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    {/* Details & Actions */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-serif text-xl font-bold text-[#F6F0EC]">
                              {item.name}
                            </h2>
                            <span
                              className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${statusTone(
                                item.status
                              )}`}
                            >
                              {LISTING_STATUS_LABELS[item.status]}
                            </span>
                            {item.verifiedShelter && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                                <ShieldCheck className="h-3.5 w-3.5" /> Verified shelter
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[#B8A8AE]">
                            <span className="capitalize">{item.species}</span> · {item.breed} · {item.city}, {item.district}, {item.stateName}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedListingId(isExpanded ? null : item.id)
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#382D32] bg-[#161114] px-3.5 py-1.5 text-xs font-semibold text-[#E2B75B] hover:border-[#E2B75B]"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Inquiries ({itemRequests.length})
                          {pendingReqCount > 0 && (
                            <span className="ml-1 rounded bg-[#7B1E3A] px-1.5 py-0.5 text-[10px] text-white">
                              {pendingReqCount} new
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Admin Feedback */}
                      {(item.status === 'rejected' ||
                        item.status === 'changes_requested' ||
                        item.status === 'expired_hidden') &&
                        item.moderationReason && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
                            <strong className="inline-flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" /> Note:
                            </strong>{' '}
                            {item.moderationReason}
                          </div>
                        )}

                      {/* 50-Day Inactivity Reminder Banner */}
                      {item.status === 'approved' && inactivity.daysInactive >= 50 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 p-3 text-xs text-amber-200">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-4 w-4 shrink-0" />
                            Auto-hides in {inactivity.daysUntilAutoHide} day(s) due to inactivity.
                          </span>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleRenew(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1 font-semibold text-amber-100 hover:bg-amber-500/30"
                          >
                            <RefreshCw className="h-3 w-3" /> Keep listing active
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.status !== LISTING_STATUS.ADOPTED && (
                          <button
                            type="button"
                            onClick={() => navigate(`${ROUTES.LIST_ANIMAL}?edit=${item.id}`)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#382D32] bg-[#161114] px-3.5 py-1.5 text-xs font-semibold text-[#F6F0EC] hover:border-[#D94F73]"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}

                        {item.status === LISTING_STATUS.APPROVED && (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleStatusChange(item.id, 'on_hold')}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#382D32] bg-[#161114] px-3.5 py-1.5 text-xs font-semibold text-[#CBBBC2] hover:border-[#6A4A57]"
                          >
                            <PauseCircle className="h-3.5 w-3.5" /> Put On Hold
                          </button>
                        )}

                        {item.status === LISTING_STATUS.ON_HOLD && (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleStatusChange(item.id, 'approved')}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/70"
                          >
                            <PlayCircle className="h-3.5 w-3.5" /> Resume Live
                          </button>
                        )}

                        {(item.status === LISTING_STATUS.APPROVED ||
                          item.status === LISTING_STATUS.ON_HOLD) && (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleStatusChange(item.id, 'adopted')}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                          >
                            <HeartHandshake className="h-3.5 w-3.5" /> Mark Adopted
                          </button>
                        )}

                        {item.status === LISTING_STATUS.EXPIRED_HIDDEN && (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => handleRenew(item.id)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#7B1E3A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#932547]"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Re-submit for Approval
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-950/60"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inquiries Expansion Panel */}
                  {isExpanded && (
                    <div className="mt-5 border-t border-[#382D32] pt-5 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B8A8AE]">
                        Interested Adopters ({itemRequests.length})
                      </h3>

                      {itemRequests.length === 0 ? (
                        <p className="text-xs text-[#8D7D83]">
                          No inquiries received yet. When an adopter taps &ldquo;I&apos;m interested&rdquo;, their introduction will appear here for your decision.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {itemRequests.map((req) => (
                            <div
                              key={req.id}
                              className="rounded-2xl border border-[#382D32] bg-[#161114] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <strong className="text-sm text-[#F6F0EC]">
                                    {req.adopterName}
                                  </strong>
                                  <span className="text-xs text-[#8D7D83]">
                                    ({req.housingType.replace('_', ' ')} · {req.experience})
                                  </span>
                                  {req.status === 'approved' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Accepted (Phone revealed)
                                    </span>
                                  )}
                                  {req.status === 'rejected' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300">
                                      <XCircle className="h-3.5 w-3.5" /> Declined
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#CBBBC2] leading-relaxed">
                                  {req.reason}
                                </p>
                              </div>

                              {req.status === 'pending' && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    disabled={busyId === req.id}
                                    onClick={() => handleDecision(req, 'approved')}
                                    className="min-h-[38px] rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                  >
                                    Accept &amp; Reveal Phone
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyId === req.id}
                                    onClick={() => handleDecision(req, 'rejected')}
                                    className="min-h-[38px] rounded-xl border border-[#382D32] bg-[#110E10] px-3.5 py-1.5 text-xs font-semibold text-rose-200 hover:border-rose-400 disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#382D32] bg-[#1B1618] p-6 space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#F6F0EC]">
              Delete Listing?
            </h3>
            <p className="text-xs text-[#B8A8AE]">
              This permanently removes the animal profile and hidden contact details. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl border border-[#382D32] px-4 py-2 text-xs font-semibold text-[#CBBBC2]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmDeleteId}
                onClick={() => handleDelete(confirmDeleteId)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {busyId === confirmDeleteId ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
