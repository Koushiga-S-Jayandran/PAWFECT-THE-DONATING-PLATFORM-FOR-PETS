import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Flag,
  Loader2,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { shelterReader } from '../../app/container.js';
import { ROUTES } from '../../config/constants.js';
import {
  LISTING_STATUS,
  LISTING_STATUS_LABELS,
} from '../../config/adoptionListingConfig.js';
import type {
  AdoptionListing,
  ListingAuditLog,
  ListingReport,
} from '../../domain/adoptionListingEntities.js';
import type { AdminModerationDecision } from '../../domain/listingLifecycle.js';
import { adoptionModerationService } from '../../services/AdoptionModerationService.js';

type ModerationTab =
  | 'pending'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'reports'
  | 'audit';

export const AdminAdoptionsPage: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ModerationTab>('pending');

  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<ListingAuditLog[]>([]);

  const [selectedListing, setSelectedListing] = useState<AdoptionListing | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    listing: AdoptionListing;
    decision: AdminModerationDecision;
  } | null>(null);
  const [reportModal, setReportModal] = useState<{
    report: ListingReport;
    resolution: 'resolved_dismissed' | 'resolved_removed';
  } | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    shelterReader
      .checkIsAdmin(user.uid)
      .then((ok) => setIsAdmin(ok))
      .catch(() => setIsAdmin(false))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const loadAdminData = useCallback(async () => {
    if (!user?.uid || !isAdmin) return;
    setLoading(true);
    try {
      const data = await adoptionModerationService.fetchAdminDashboardData(user.uid);
      setListings(data.listings);
      setReports(data.reports);
      setAuditLogs(data.auditLogs);
    } catch {
      // ignore generic failure
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, loadAdminData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  if (loading && isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#110E10] text-[#F6F0EC] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D94F73]" />
      </div>
    );
  }

  // Mask admin route cleanly for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#110E10] text-[#F6F0EC] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-serif text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-xs text-[#B8A8AE]">
          The page you requested could not be found on this server.
        </p>
        <Link
          to={ROUTES.PETS}
          className="mt-6 rounded-xl border border-[#382D32] px-4 py-2 text-xs font-semibold text-[#CBBBC2]"
        >
          Back to Adopt
        </Link>
      </div>
    );
  }

  const handleConfirmDecision = async () => {
    if (!user?.uid || !decisionModal) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await adoptionModerationService.moderateListing({
        adminUid: user.uid,
        listing: decisionModal.listing,
        decision: decisionModal.decision,
        reason: reasonInput,
      });
      showToast(`Listing updated to "${decisionModal.decision}".`);
      setDecisionModal(null);
      setSelectedListing(null);
      setReasonInput('');
      await loadAdminData();
    } catch (err: any) {
      setActionError(err?.issues?.[0]?.message || err?.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReportResolution = async () => {
    if (!user?.uid || !reportModal) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await adoptionModerationService.resolveReport({
        adminUid: user.uid,
        report: reportModal.report,
        resolution: reportModal.resolution,
        note: reasonInput,
      });
      showToast('Report resolved and logged.');
      setReportModal(null);
      setReasonInput('');
      await loadAdminData();
    } catch (err: any) {
      setActionError(err?.issues?.[0]?.message || err?.message || 'Resolution failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredListings = listings.filter((l) => l.status === tab);
  const openReports = reports.filter((r) => r.status === 'open');

  return (
    <div className="min-h-screen bg-[#110E10] text-[#F6F0EC] flex flex-col">
      <header className="border-b border-[#2D2328] bg-[#161114]/95 sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            to={ROUTES.PETS}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#CBBBC2] hover:text-[#F6F0EC]"
          >
            <ArrowLeft className="h-4 w-4" /> Adoption Portal
          </Link>

          <button
            type="button"
            onClick={loadAdminData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#382D32] bg-[#1B1618] px-3.5 py-2 text-xs font-semibold text-[#CBBBC2] hover:border-[#D94F73]"
          >
            <RotateCw className="h-3.5 w-3.5" /> Refresh
          </button>
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E2B75B]">
            Admin Moderation Desk
          </span>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#F6F0EC]">
            Adoption Listings &amp; Safety Queue
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-[#2D2328] pb-3">
          {(
            [
              { id: 'pending', label: `Pending (${listings.filter((l) => l.status === 'pending').length})` },
              { id: 'changes_requested', label: `Changes Requested (${listings.filter((l) => l.status === 'changes_requested').length})` },
              { id: 'approved', label: `Approved (${listings.filter((l) => l.status === 'approved').length})` },
              { id: 'rejected', label: `Rejected (${listings.filter((l) => l.status === 'rejected').length})` },
              { id: 'reports', label: `Reports (${openReports.length} open)` },
              { id: 'audit', label: `Audit Logs (${auditLogs.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-[#7B1E3A] text-white'
                  : 'border border-[#382D32] bg-[#1B1618] text-[#B8A8AE] hover:text-[#F6F0EC]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#D94F73]" />
          </div>
        ) : tab === 'reports' ? (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="rounded-2xl border border-[#382D32] bg-[#1B1618] p-10 text-center text-xs text-[#8D7D83]">
                No listing reports submitted.
              </div>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-2xl border border-[#382D32] bg-[#1B1618] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Flag className="h-4 w-4 text-rose-400" />
                      <strong className="text-sm text-[#F6F0EC]">{rep.listingName}</strong>
                      <span className="rounded bg-[#2D2328] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#E2B75B]">
                        {rep.reason.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-[#8D7D83]">Status: {rep.status}</span>
                    </div>
                    <p className="text-xs text-[#CBBBC2]">{rep.details}</p>
                    {rep.resolutionNote && (
                      <p className="text-xs text-emerald-300">Resolution: {rep.resolutionNote}</p>
                    )}
                  </div>

                  {rep.status === 'open' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setReasonInput('');
                          setReportModal({ report: rep, resolution: 'resolved_removed' });
                        }}
                        className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                      >
                        Remove Listing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setReasonInput('');
                          setReportModal({ report: rep, resolution: 'resolved_dismissed' });
                        }}
                        className="rounded-xl border border-[#382D32] bg-[#161114] px-3.5 py-2 text-xs font-semibold text-[#CBBBC2]"
                      >
                        Dismiss Report
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : tab === 'audit' ? (
          <div className="overflow-hidden rounded-2xl border border-[#382D32] bg-[#1B1618]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#382D32] bg-[#161114] text-[#B8A8AE]">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Listing</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Transition</th>
                  <th className="p-3.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2328]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="p-3.5 text-[#8D7D83]">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 font-mono text-[#CBBBC2]">{log.listingId.slice(0, 10)}</td>
                    <td className="p-3.5 font-semibold text-[#F6F0EC]">{log.action}</td>
                    <td className="p-3.5 text-[#E2B75B]">
                      {log.fromStatus ? `${log.fromStatus} -> ${log.toStatus}` : log.toStatus}
                    </td>
                    <td className="p-3.5 text-[#B8A8AE]">{log.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-2xl border border-[#382D32] bg-[#1B1618] p-10 text-center text-xs text-[#8D7D83]">
            No listings in {tab.replace('_', ' ')} status.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#382D32] bg-[#1B1618]"
              >
                {item.photos[0] && (
                  <div className="aspect-4/3 w-full overflow-hidden bg-[#110E10]">
                    <img src={item.photos[0]} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-serif text-lg font-bold text-[#F6F0EC]">{item.name}</h2>
                    {item.verifiedShelter && (
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#B8A8AE]">
                    <span className="capitalize">{item.species}</span> · {item.breed} · {item.city}, {item.district}, {item.stateCode}
                  </p>
                  <p className="text-xs text-[#CBBBC2] line-clamp-3">{item.story}</p>

                  <div className="mt-auto pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedListing(item)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#382D32] bg-[#161114] px-4 py-1.5 text-xs font-semibold text-[#F6F0EC] hover:border-[#D94F73]"
                    >
                      <Eye className="h-3.5 w-3.5" /> Review Listing
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Drawer */}
      {selectedListing && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-black/70">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-[#1B1618] border-l border-[#382D32] p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-[#382D32] pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#E2B75B]">
                  {LISTING_STATUS_LABELS[selectedListing.status]}
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#F6F0EC]">
                  {selectedListing.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="rounded-lg p-1.5 text-[#B8A8AE] hover:text-[#F6F0EC]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedListing.listerUid === user?.uid && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                Self-approval blocked: another admin must review your own listing.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {selectedListing.photos.map((url, idx) => (
                <img
                  key={url + idx}
                  src={url}
                  alt={`${selectedListing.name} ${idx + 1}`}
                  className="aspect-4/3 w-full rounded-xl object-cover border border-[#382D32]"
                />
              ))}
            </div>

            <div className="space-y-2 text-xs text-[#CBBBC2]">
              <p>
                <strong className="text-[#F6F0EC]">Lister Type:</strong>{' '}
                {selectedListing.listerType}{' '}
                {selectedListing.verifiedShelter && `(${selectedListing.shelterName} — Verified)`}
              </p>
              <p>
                <strong className="text-[#F6F0EC]">Details:</strong> {selectedListing.species} · {selectedListing.breed} · {selectedListing.ageMonths} mo · {selectedListing.gender} · {selectedListing.size} · {selectedListing.color}
              </p>
              <p>
                <strong className="text-[#F6F0EC]">Medical:</strong> Vaccinated: {selectedListing.vaccinated ? 'Yes' : 'No'} · Sterilised: {selectedListing.sterilised ? 'Yes' : 'No'} · Notes: {selectedListing.injuriesOrConditions}
              </p>
              <p>
                <strong className="text-[#F6F0EC]">Location:</strong> {selectedListing.city}, {selectedListing.district}, {selectedListing.stateName}
              </p>
              <p className="rounded-xl border border-[#382D32] bg-[#161114] p-3 leading-relaxed">
                {selectedListing.story}
              </p>
            </div>

            {selectedListing.listerUid !== user?.uid && (
              <div className="flex flex-wrap gap-2.5 border-t border-[#382D32] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setReasonInput('');
                    setDecisionModal({ listing: selectedListing, decision: LISTING_STATUS.APPROVED });
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setReasonInput('');
                    setDecisionModal({ listing: selectedListing, decision: LISTING_STATUS.CHANGES_REQUESTED });
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500"
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setReasonInput('');
                    setDecisionModal({ listing: selectedListing, decision: LISTING_STATUS.REJECTED });
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Confirmation Modal */}
      {decisionModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#382D32] bg-[#1B1618] p-6 space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#F6F0EC]">
              Confirm: {decisionModal.decision.replace('_', ' ')}
            </h3>

            {decisionModal.decision !== 'approved' ? (
              <div>
                <label className="block text-xs font-semibold text-[#CBBBC2] mb-1.5">
                  Reason / Requested Changes (10–300 chars) *
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Explain clearly what needs to change or why this listing was rejected..."
                  className="w-full rounded-xl border border-[#382D32] bg-[#161114] p-3 text-xs text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
                />
              </div>
            ) : (
              <p className="text-xs text-emerald-200">
                This listing will go live immediately on the public Adoption Portal.
              </p>
            )}

            {actionError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="rounded-xl border border-[#382D32] px-4 py-2 text-xs font-semibold text-[#CBBBC2]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDecision}
                className="rounded-xl bg-[#7B1E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#932547] disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Resolution Modal */}
      {reportModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#382D32] bg-[#1B1618] p-6 space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#F6F0EC]">
              {reportModal.resolution === 'resolved_removed'
                ? 'Remove Reported Listing'
                : 'Dismiss Safety Report'}
            </h3>
            <textarea
              rows={3}
              maxLength={300}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Document investigation findings (10–300 chars)..."
              className="w-full rounded-xl border border-[#382D32] bg-[#161114] p-3 text-xs text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
            />
            {actionError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
                {actionError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReportModal(null)}
                className="rounded-xl border border-[#382D32] px-4 py-2 text-xs font-semibold text-[#CBBBC2]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReportResolution}
                className="rounded-xl bg-[#7B1E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#932547] disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
