import React, { useState } from 'react';
import { X, Flag, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import type { AdoptionListing, ListingReport } from '../../domain/adoptionListingEntities.js';
import { adoptionModerationService } from '../../services/AdoptionModerationService.js';

interface ReportListingModalProps {
  listing: AdoptionListing;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportListingModal: React.FC<ReportListingModalProps> = ({
  listing,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<ListingReport['reason']>('suspected_sale');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setError(null);
    setSubmitting(true);

    try {
      await adoptionModerationService.submitReport({
        listing,
        reporterUid: user.uid,
        reason,
        details,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.issues?.[0]?.message || err?.message || 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={() => !submitting && onClose()} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-[#382D32] bg-[#1B1618] p-6 text-[#F6F0EC] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#382D32] pb-3.5">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-rose-400" />
            <h2 className="font-serif text-lg font-bold">Report This Listing</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#B8A8AE] hover:text-[#F6F0EC]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="text-sm font-semibold">Report Received</p>
            <p className="text-xs text-[#B8A8AE]">
              Thank you for keeping Pawfect safe. Our moderation team will review this report promptly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#7B1E3A] px-5 py-2 text-xs font-semibold text-white"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBBBC2] mb-1">
                Issue Type *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ListingReport['reason'])}
                className="w-full rounded-xl border border-[#382D32] bg-[#161114] px-3 py-2.5 text-xs text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
              >
                <option value="suspected_sale">Suspected selling / breeding</option>
                <option value="fraud_or_upfront_fee">Asking for upfront fee or payment</option>
                <option value="animal_cruelty">Animal welfare / cruelty concern</option>
                <option value="misleading_info">Fake photos or misleading details</option>
                <option value="other">Other safety concern</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBBBC2] mb-1">
                Details * (min 10 chars)
              </label>
              <textarea
                rows={4}
                required
                maxLength={500}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what happened so moderators can act quickly..."
                className="w-full rounded-xl border border-[#382D32] bg-[#161114] p-3 text-xs text-[#F6F0EC] focus:border-[#D94F73] focus:outline-none"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#382D32] px-4 py-2 text-xs font-semibold text-[#CBBBC2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
