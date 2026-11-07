/**
 * Shelter Browse Service
 * Powers donor shelter discovery, multi-criteria filtering, search, and detail retrieval.
 * Adheres strictly to Zero-Trust data exposure limits (only APPROVED shelters shown).
 */

import type { ShelterReader } from '../domain/shelterInterfaces.js';
import type { Shelter } from '../domain/shelterEntities.js';
import { isStateCodeEnabled } from '../config/regions.js';

export interface ShelterFilterCriteria {
  searchQuery?: string;
  stateCode?: string;
  district?: string;
  animalTypes?: string[];
  urgency?: string;
  verifiedOnly?: boolean;
}

export class ShelterBrowseService {
  constructor(private shelterReader: ShelterReader) {}

  async getApprovedShelters(criteria: ShelterFilterCriteria = {}): Promise<{
    items: Shelter[];
    totalCount: number;
  }> {
    // 1. Fetch approved shelters from repository (at most 200)
    const allApproved = await this.shelterReader.getApprovedShelters(200);

    // 2. Client-side filtering across enabled regions and donor criteria
    const filtered = allApproved.filter((shelter) => {
      // Must be in an enabled region
      if (!isStateCodeEnabled(shelter.stateCode)) {
        return false;
      }

      // State filter
      if (criteria.stateCode && shelter.stateCode !== criteria.stateCode) {
        return false;
      }

      // District filter
      if (criteria.district && shelter.district.toLowerCase() !== criteria.district.toLowerCase()) {
        return false;
      }

      // Urgency filter
      if (criteria.urgency && shelter.urgency !== criteria.urgency) {
        return false;
      }

      // Verified only
      if (criteria.verifiedOnly && !shelter.verified) {
        return false;
      }

      // Animal types (intersection check)
      if (criteria.animalTypes && criteria.animalTypes.length > 0) {
        const hasMatchingAnimal = criteria.animalTypes.some((type) =>
          shelter.animalTypes.includes(type as any)
        );
        if (!hasMatchingAnimal) return false;
      }

      // Search text (name, area, description, district)
      if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
        const query = criteria.searchQuery.toLowerCase().trim();
        const searchableText = `${shelter.name} ${shelter.area} ${shelter.district} ${shelter.description}`.toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });

    return {
      items: filtered,
      totalCount: filtered.length,
    };
  }

  async getShelterDetails(id: string): Promise<Shelter | null> {
    const shelter = await this.shelterReader.getShelterById(id);
    if (!shelter) return null;

    // Zero-Trust check: Donors can ONLY view APPROVED shelters in enabled states
    if (shelter.status !== 'APPROVED' || !isStateCodeEnabled(shelter.stateCode)) {
      return null;
    }

    return shelter;
  }
}
