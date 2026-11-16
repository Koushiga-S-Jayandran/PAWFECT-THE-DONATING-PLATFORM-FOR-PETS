/**
 * Adoption Moderation & Reporting Service
 * Admin-only listing moderation (approve, reject, request changes) + safety reporting queue.
 */

import { LISTING_STATUS, REPORT_STATUS } from '../config/adoptionListingConfig.js';
import type {
  AdoptionListing,
  ListingReport,
  ListingAuditLog,
} from '../domain/adoptionListingEntities.js';
import {
  canAdminModerateListing,
  type AdminModerationDecision,
} from '../domain/listingLifecycle.js';
import {
  moderationReasonSchema,
  reportListingSchema,
} from '../security/adoptionListingValidation.js';
import { adoptionListingRepo } from '../repositories/FirebaseAdoptionListingRepository.js';
import { shelterReader } from '../app/container.js';

export class AdoptionModerationService {
  async moderateListing(params: {
    adminUid: string;
    listing: AdoptionListing;
    decision: AdminModerationDecision;
    reason?: string;
  }): Promise<void> {
    const isAdmin = await shelterReader.checkIsAdmin(params.adminUid);

    let sanitizedReason = '';
    if (params.decision !== LISTING_STATUS.APPROVED) {
      sanitizedReason = moderationReasonSchema.parse(params.reason || '');
    }

    const check = canAdminModerateListing({
      isAdmin,
      adminUid: params.adminUid,
      listerUid: params.listing.listerUid,
      fromStatus: params.listing.status,
      decision: params.decision,
      reason: sanitizedReason,
    });
    if (!check.allowed) {
      throw new Error(check.error || 'Moderation action denied.');
    }

    const nowIso = new Date().toISOString();
    const actionLabel =
      params.decision === LISTING_STATUS.APPROVED
        ? 'ADMIN_APPROVED_LISTING'
        : params.decision === LISTING_STATUS.CHANGES_REQUESTED
        ? 'ADMIN_REQUESTED_CHANGES'
        : 'ADMIN_REJECTED_LISTING';

    const notificationMessage =
      params.decision === LISTING_STATUS.APPROVED
        ? `Your adoption listing for ${params.listing.name} is approved and live for adopters!`
        : params.decision === LISTING_STATUS.CHANGES_REQUESTED
        ? `Changes requested for ${params.listing.name}: ${sanitizedReason}`
        : `Your listing for ${params.listing.name} was not approved: ${sanitizedReason}`;

    await adoptionListingRepo.updateListingFieldsWithAudit({
      listingId: params.listing.id,
      updates: {
        status: params.decision,
        moderationReason: params.decision === LISTING_STATUS.APPROVED ? '' : sanitizedReason,
        moderatedBy: params.adminUid,
        moderatedAt: nowIso,
        wasPreviouslyApproved:
          params.decision === LISTING_STATUS.APPROVED || params.listing.wasPreviouslyApproved,
        lastActivityAt: nowIso,
        updatedAt: nowIso,
      },
      auditLog: {
        id: `mod_${params.listing.id}_${params.decision}_${Date.now()}`,
        listingId: params.listing.id,
        actorUid: params.adminUid,
        actorRole: 'admin',
        action: actionLabel,
        fromStatus: params.listing.status,
        toStatus: params.decision,
        reason: sanitizedReason,
        createdAt: nowIso,
      },
      notification: {
        recipientUid: params.listing.listerUid,
        id: `mod_${params.listing.id}_${params.decision}_${Date.now()}`,
        type: 'status_update',
        message: notificationMessage,
        listingId: params.listing.id,
        petName: params.listing.name,
      },
    });
  }

  async submitReport(params: {
    listing: AdoptionListing;
    reporterUid: string;
    reason: ListingReport['reason'];
    details: string;
  }): Promise<void> {
    if (params.reporterUid === params.listing.listerUid) {
      throw new Error('You cannot report your own listing.');
    }

    const parsed = reportListingSchema.parse({
      reason: params.reason,
      details: params.details,
    });

    const nowIso = new Date().toISOString();
    const report: ListingReport = {
      id: `${params.reporterUid}_${params.listing.id}`,
      listingId: params.listing.id,
      listingName: params.listing.name,
      listerUid: params.listing.listerUid,
      reporterUid: params.reporterUid,
      reason: parsed.reason,
      details: parsed.details,
      status: REPORT_STATUS.OPEN,
      createdAt: nowIso,
    };

    await adoptionListingRepo.createListingReport(report);
  }

  async resolveReport(params: {
    adminUid: string;
    report: ListingReport;
    resolution: 'resolved_dismissed' | 'resolved_removed';
    note: string;
  }): Promise<void> {
    const isAdmin = await shelterReader.checkIsAdmin(params.adminUid);
    if (!isAdmin) {
      throw new Error('Admin privileges required.');
    }
    const sanitizedNote = moderationReasonSchema.parse(params.note);
    await adoptionListingRepo.resolveReport({
      report: params.report,
      adminUid: params.adminUid,
      resolution: params.resolution,
      note: sanitizedNote,
    });
  }

  async fetchAdminDashboardData(adminUid: string): Promise<{
    listings: AdoptionListing[];
    reports: ListingReport[];
    auditLogs: ListingAuditLog[];
  }> {
    const isAdmin = await shelterReader.checkIsAdmin(adminUid);
    if (!isAdmin) {
      throw new Error('Admin privileges required.');
    }
    const [listings, reports, auditLogs] = await Promise.all([
      adoptionListingRepo.getAllListingsForAdmin(),
      adoptionListingRepo.getAllReportsForAdmin(),
      adoptionListingRepo.getRecentListingAuditLogs(),
    ]);
    return { listings, reports, auditLogs };
  }
}

export const adoptionModerationService = new AdoptionModerationService();
