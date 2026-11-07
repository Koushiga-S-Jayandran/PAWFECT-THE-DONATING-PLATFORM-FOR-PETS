import React, { useState, useEffect, useRef } from 'react';
import {
  shelterReader,
  shelterModerationService,
  authGateway,
} from '../../app/container.js';
import type {
  Shelter,
  ShelterPrivate,
  ShelterStatus,
} from '../../domain/shelterEntities.js';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { Card } from '../../ui/components/Card.js';
import { Badge } from '../../ui/components/Badge.js';
import { Button } from '../../ui/components/Button.js';
import { getRegionByCode } from '../../config/regions.js';
import { getAnimalTypeLabel } from '../../config/animalTypes.js';
import { getAvailableAdminActions } from '../../state-machines/shelterStateMachine.js';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Clock,
  Eye,
  X,
  Phone,
  CreditCard,
  Building,
  ExternalLink,
  RotateCw,
} from 'lucide-react';

type AdminTab = ShelterStatus;

export const AdminSheltersPage: React.FC = () => {
  const currentUser = authGateway.getCurrentUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('PENDING');
  const [sheltersList, setSheltersList] = useState<
    readonly { shelter: Shelter; privateData: ShelterPrivate }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected shelter for detailed side drawer
  const [selectedItem, setSelectedItem] = useState<{
    shelter: Shelter;
    privateData: ShelterPrivate;
  } | null>(null);

  // Action Dialog State
  const [dialogAction, setDialogAction] = useState<ShelterStatus | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  // 1. Authorize Admin check
  useEffect(() => {
    if (!currentUser) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }
    shelterReader
      .checkIsAdmin(currentUser.uid)
      .then((allowed) => {
        setIsAdmin(allowed);
      })
      .catch(() => {
        setIsAdmin(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentUser]);

  // 2. Fetch shelters
  const loadShelters = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const data = await shelterReader.getAllSheltersForAdmin();
      setSheltersList(data);
      // Refresh selected item if open
      if (selectedItem) {
        const found = data.find((i) => i.shelter.ownerId === selectedItem.shelter.ownerId);
        if (found) setSelectedItem(found);
      }
    } catch {
      // Generic error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadShelters();
    }
  }, [isAdmin]);

  // Focus trap for dialog & Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialogAction(null);
      }
    };
    if (dialogAction) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogAction]);

  // Not found mask: If not admin, return plain generic not found (no mention of admin)
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

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 py-20 text-center">
          <div className="max-w-md space-y-3">
            <h1 className="font-heading text-3xl font-medium text-[#231A1D]">
              Page not found
            </h1>
            <p className="text-xs text-[#6B5B61]">
              The page you requested could not be found on this server.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const filteredItems = sheltersList.filter(
    (item) => item.shelter.status === activeTab
  );

  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleOpenActionDialog = (newStatus: ShelterStatus) => {
    setDialogAction(newStatus);
    setReasonInput('');
    setDialogError(null);
  };

  const handleConfirmAction = async () => {
    if (!selectedItem || !dialogAction || !currentUser) return;
    setIsSubmittingAction(true);
    setDialogError(null);

    try {
      await shelterModerationService.changeStatus({
        adminUid: currentUser.uid,
        shelterId: selectedItem.shelter.ownerId,
        expectedVersion: selectedItem.shelter.statusVersion,
        newStatus: dialogAction,
        reason: reasonInput,
      });

      setToastMessage(`Shelter status updated to ${dialogAction}.`);
      setTimeout(() => setToastMessage(null), 3000);
      setDialogAction(null);
      await loadShelters();
    } catch (err: any) {
      setDialogError(err?.message || 'Failed to update shelter status.');
      // If stale version error, reload data
      if (err?.message?.includes('updated by someone else')) {
        await loadShelters();
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const isSelfShelter = selectedItem?.shelter.ownerId === currentUser?.uid;
  const availableActions = selectedItem
    ? getAvailableAdminActions(selectedItem.shelter.status)
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-20 right-6 z-50 rounded-xl bg-[#2E7D5B] px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-in fade-in"
        >
          {toastMessage}
        </div>
      )}

      <main className="flex-1 pb-16">
        {/* Admin Header */}
        <div className="border-b border-[#E7DEDF] bg-white py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[#7B1E3A] uppercase tracking-wider">
                  Admin Verification Desk
                </span>
                <h1 className="font-heading text-2xl font-medium text-[#231A1D]">
                  Shelter Moderation
                </h1>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadShelters}
                className="gap-2 self-start sm:self-auto"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-6 flex flex-wrap gap-2 border-b border-[#E7DEDF]/50 pb-2">
              {(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REMOVED'] as AdminTab[]).map(
                (tab) => {
                  const count = sheltersList.filter(
                    (i) => i.shelter.status === tab
                  ).length;
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-[#7B1E3A] text-white shadow-xs'
                          : 'border border-[#E7DEDF] bg-[#FAF7F2] text-[#6B5B61] hover:text-[#231A1D]'
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Shelter List Section */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-[#E7DEDF] bg-white p-12 text-center text-xs text-[#6B5B61]">
              No shelters currently in {activeTab} status.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-[#E7DEDF] bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E7DEDF] bg-[#FAF7F2] text-[#6B5B61]">
                    <tr>
                      <th className="p-4 font-semibold">Shelter Name</th>
                      <th className="p-4 font-semibold">Location</th>
                      <th className="p-4 font-semibold">Submitted Date</th>
                      <th className="p-4 font-semibold">Version</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7DEDF]">
                    {filteredItems.map((item) => {
                      const region = getRegionByCode(item.shelter.stateCode);
                      return (
                        <tr
                          key={item.shelter.ownerId}
                          className="hover:bg-[#FAF7F2]/60 transition-colors"
                        >
                          <td className="p-4 font-medium text-[#231A1D]">
                            {item.shelter.name}
                            {item.shelter.verified && (
                              <span className="ml-1.5 inline-block text-[#2E7D5B]">✓</span>
                            )}
                          </td>
                          <td className="p-4 text-[#6B5B61]">
                            {item.shelter.district}, {region?.name} ({item.shelter.stateCode})
                          </td>
                          <td className="p-4 text-[#6B5B61]">
                            {formatDateTime(item.shelter.createdAt)}
                          </td>
                          <td className="p-4 text-[#6B5B61]">
                            v{item.shelter.statusVersion}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                              className="gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Review</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredItems.map((item) => {
                  const region = getRegionByCode(item.shelter.stateCode);
                  return (
                    <Card
                      key={item.shelter.ownerId}
                      padding="sm"
                      className="shadow-xs text-left space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-heading text-base font-medium text-[#231A1D]">
                          {item.shelter.name}
                        </h3>
                        <span className="text-[10px] text-[#6B5B61]">
                          v{item.shelter.statusVersion}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B5B61]">
                        {item.shelter.district}, {region?.name}
                      </p>
                      <p className="text-[11px] text-[#6B5B61]">
                        Submitted: {formatDateTime(item.shelter.createdAt)}
                      </p>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                          className="w-full gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Review full details</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Slide-in Detail Drawer for Admin Review */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-[#231A1D]/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl overflow-y-auto p-6 sm:p-8 text-left animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E7DEDF]">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-[#7B1E3A] uppercase">
                  Verification Detail Panel
                </span>
                <h2 className="font-heading text-xl font-medium text-[#231A1D]">
                  {selectedItem.shelter.name}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="primary" className="py-0.5 px-2 text-[10px]">
                    Status: {selectedItem.shelter.status}
                  </Badge>
                  <span className="text-xs text-[#6B5B61]">
                    v{selectedItem.shelter.statusVersion}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl p-2 text-[#6B5B61] hover:bg-[#FAF7F2] hover:text-[#231A1D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
                aria-label="Close detail panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Self-approval warning banner if admin owns this shelter */}
            {isSelfShelter && (
              <div
                role="alert"
                className="my-4 rounded-xl border border-[#B4423A]/30 bg-[#B4423A]/10 p-4 text-xs text-[#B4423A] flex items-start gap-2.5"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Self-Approval Blocked:</strong> You cannot moderate your own registered shelter. Another admin must review this shelter.
                </p>
              </div>
            )}

            {/* Public Details */}
            <div className="space-y-4 py-4 border-b border-[#E7DEDF] text-xs">
              <h3 className="font-semibold text-sm text-[#231A1D]">Public Overview</h3>
              <p>
                <strong className="text-[#231A1D]">Location:</strong>{' '}
                {selectedItem.shelter.area}, {selectedItem.shelter.district},{' '}
                {selectedItem.shelter.stateCode}
              </p>
              <p>
                <strong className="text-[#231A1D]">Animals Cared For:</strong>{' '}
                {selectedItem.shelter.animalTypes.map(getAnimalTypeLabel).join(', ')}
              </p>
              <p>
                <strong className="text-[#231A1D]">Urgency:</strong>{' '}
                {selectedItem.shelter.urgency} ({selectedItem.shelter.urgencyNote || 'None'})
              </p>
              <p className="text-[#6B5B61] leading-relaxed">
                <strong className="text-[#231A1D]">Description:</strong><br />
                {selectedItem.shelter.description}
              </p>
            </div>

            {/* Private Details for Verification (Phone & Website check) */}
            <div className="space-y-4 py-4 border-b border-[#E7DEDF] text-xs">
              <h3 className="font-semibold text-sm text-[#231A1D] flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-[#7B1E3A]" />
                <span>Private Verification Vault</span>
              </h3>

              <div className="rounded-xl border border-[#E7DEDF] bg-[#FAF7F2] p-4 space-y-2">
                <p>
                  <strong className="text-[#231A1D]">Contact Representative:</strong>{' '}
                  {selectedItem.privateData.contactPerson}
                </p>
                <p>
                  <strong className="text-[#231A1D]">Phone:</strong>{' '}
                  <a
                    href={`tel:${selectedItem.privateData.phone}`}
                    className="text-[#7B1E3A] font-semibold underline"
                  >
                    {selectedItem.privateData.phone}
                  </a>
                </p>
                <p>
                  <strong className="text-[#231A1D]">Full Physical Address:</strong>{' '}
                  {selectedItem.privateData.fullAddress}
                </p>
                <p>
                  <strong className="text-[#231A1D]">UPI ID:</strong>{' '}
                  <span className="font-mono text-[#231A1D] bg-white px-2 py-0.5 rounded border border-[#E7DEDF]">
                    {selectedItem.privateData.upiId}
                  </span>{' '}
                  ({selectedItem.privateData.upiHolderName})
                </p>
                <p>
                  <strong className="text-[#231A1D]">Registration / Trust Number:</strong>{' '}
                  {selectedItem.privateData.registrationNumber || 'Not provided'}
                </p>
                {selectedItem.privateData.supportLink && (
                  <p className="flex items-center gap-1">
                    <strong className="text-[#231A1D]">Website / Link:</strong>{' '}
                    <a
                      href={selectedItem.privateData.supportLink}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-[#7B1E3A] underline inline-flex items-center gap-1"
                    >
                      <span>{selectedItem.privateData.supportLink}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
                {selectedItem.privateData.statusReason && (
                  <p className="pt-2 border-t border-[#E7DEDF] text-[#B4423A]">
                    <strong>Last Moderation Reason:</strong> {selectedItem.privateData.statusReason}
                  </p>
                )}
              </div>
            </div>

            {/* Allowed Admin Actions based on status */}
            <div className="pt-6 space-y-3">
              <h3 className="font-semibold text-sm text-[#231A1D]">
                Available Moderation Actions
              </h3>

              {isSelfShelter ? (
                <p className="text-xs text-[#6B5B61]">
                  Actions disabled: Self-approval is blocked by ABAC rules.
                </p>
              ) : availableActions.length === 0 ? (
                <p className="text-xs text-[#6B5B61]">
                  This shelter is in terminal state ({selectedItem.shelter.status}). No further status transitions allowed.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {availableActions.includes('APPROVED') && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenActionDialog('APPROVED')}
                      className="bg-[#2E7D5B] hover:bg-[#236348]"
                    >
                      Approve & Verify
                    </Button>
                  )}

                  {availableActions.includes('REJECTED') && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenActionDialog('REJECTED')}
                      className="bg-[#B4423A] hover:bg-[#8f322b]"
                    >
                      Reject (Reason Required)
                    </Button>
                  )}

                  {availableActions.includes('SUSPENDED') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenActionDialog('SUSPENDED')}
                      className="border-[#B7791F] text-[#B7791F] hover:bg-[#B7791F]/10"
                    >
                      Suspend
                    </Button>
                  )}

                  {availableActions.includes('REMOVED') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenActionDialog('REMOVED')}
                      className="border-[#B4423A] text-[#B4423A] hover:bg-[#B4423A]/10"
                    >
                      Soft Remove
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation & Reason Dialog */}
      {dialogAction && selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-action-title"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#231A1D]/60 backdrop-blur-xs"
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-2xl border border-[#E7DEDF] bg-white p-6 shadow-xl text-left space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 id="confirm-action-title" className="font-heading text-lg font-medium text-[#231A1D]">
                Confirm Action: {dialogAction}
              </h3>
              <button
                type="button"
                onClick={() => setDialogAction(null)}
                className="rounded-lg p-1.5 text-[#6B5B61] hover:text-[#231A1D]"
                aria-label="Cancel action"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B5B61]">
              You are about to change the status of <strong>{selectedItem.shelter.name}</strong> from{' '}
              <Badge variant="neutral" className="py-0 px-1 text-[10px]">{selectedItem.shelter.status}</Badge> to{' '}
              <Badge variant="primary" className="py-0 px-1 text-[10px]">{dialogAction}</Badge>.
            </p>

            {dialogError && (
              <div
                role="alert"
                className="rounded-xl border border-[#B4423A]/20 bg-[#B4423A]/10 p-3 text-xs text-[#B4423A]"
              >
                {dialogError}
              </div>
            )}

            {/* Reason Textarea (Required for REJECTED, SUSPENDED, REMOVED) */}
            {dialogAction !== 'APPROVED' ? (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#231A1D]">
                    Moderation Reason (10 to 300 characters, required)
                  </label>
                  <span className="text-[10px] text-[#6B5B61]">
                    {reasonInput.length}/300
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value.slice(0, 300))}
                  placeholder="State the specific reason or correction requested..."
                  maxLength={300}
                  className="mt-1 w-full rounded-xl border border-[#E7DEDF] p-3 text-xs text-[#231A1D] focus:border-[#7B1E3A] focus:outline-none focus:ring-2 focus:ring-[#7B1E3A]/15"
                />
              </div>
            ) : (
              <p className="text-xs text-[#2E7D5B] bg-[#2E7D5B]/10 p-3 rounded-xl">
                Approving this shelter will mark it <strong>Verified</strong> and make it immediately visible to all donors in the directory.
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E7DEDF]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogAction(null)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAction}
                isLoading={isSubmittingAction}
                disabled={isSubmittingAction || (dialogAction !== 'APPROVED' && reasonInput.trim().length < 10)}
              >
                Confirm {dialogAction}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
