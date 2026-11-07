/**
 * Admin Escalation Query Service
 * Read-only queries for donations overdue (>48h in PROOF_SUBMITTED) or marked DISPUTED.
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import type { EnhancedDonation } from '../domain/proofEntities.js';
import { OVERDUE_HOURS_MS } from '../security/flagCalculator.js';

export interface OverdueDonationItem {
  readonly donation: EnhancedDonation;
  readonly ageHours: number;
}

export class EscalationQueryService {
  async getOverdueProofSubmissions(): Promise<OverdueDonationItem[]> {
    const q = query(
      collection(db, 'donations'),
      where('status', '==', 'PROOF_SUBMITTED')
    );
    const snap = await getDocs(q);

    const now = Date.now();
    const overdueList: OverdueDonationItem[] = [];

    for (const docSnap of snap.docs) {
      const donation = docSnap.data() as EnhancedDonation;
      const submittedAt = Number(donation.proofSubmittedAt || 0);

      if (submittedAt && now - submittedAt >= OVERDUE_HOURS_MS) {
        const ageHours = Math.floor((now - submittedAt) / (60 * 60 * 1000));
        overdueList.push({
          donation,
          ageHours,
        });
      }
    }

    // Sort oldest first (highest age)
    return overdueList.sort((a, b) => b.ageHours - a.ageHours);
  }

  async getDisputedDonations(): Promise<EnhancedDonation[]> {
    const q = query(
      collection(db, 'donations'),
      where('status', '==', 'DISPUTED')
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as EnhancedDonation);

    return list.sort((a, b) => {
      const aTime = Number(a.disputedAt || a.updatedAt || 0);
      const bTime = Number(b.disputedAt || b.updatedAt || 0);
      return bTime - aTime;
    });
  }
}
