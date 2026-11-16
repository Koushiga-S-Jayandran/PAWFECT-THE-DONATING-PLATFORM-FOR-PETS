/**
 * Hook for persisting "List an Animal" multi-step form draft while filling.
 */

import { useState, useEffect, useCallback } from 'react';
import { LISTING_DRAFT_STORAGE_PREFIX } from '../config/adoptionListingConfig.js';
import type { ListingFormDraft } from '../domain/adoptionListingEntities.js';

export const EMPTY_LISTING_DRAFT: ListingFormDraft = {
  step: 1,
  listerType: 'individual',
  name: '',
  isUnnamed: false,
  species: 'dog',
  breed: '',
  ageValue: 12,
  ageUnit: 'months',
  gender: 'male',
  size: 'medium',
  color: '',
  vaccinated: false,
  sterilised: false,
  injuriesOrConditions: '',
  temperament: [],
  goodWithKids: 'unknown',
  goodWithOtherPets: 'unknown',
  photos: [],
  story: '',
  stateCode: 'TN',
  district: '',
  city: '',
  contactName: '',
  phone: '',
  revealOnlyToApproved: true,
  phoneVerifiedForNumber: '',
};

export function useListingFormDraft(uid: string | undefined, disabled: boolean = false) {
  const storageKey = uid ? `${LISTING_DRAFT_STORAGE_PREFIX}${uid}` : null;

  const [draft, setDraft] = useState<ListingFormDraft>(() => {
    if (disabled || !storageKey || typeof window === 'undefined') {
      return EMPTY_LISTING_DRAFT;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return EMPTY_LISTING_DRAFT;
      const parsed = JSON.parse(raw);
      return { ...EMPTY_LISTING_DRAFT, ...parsed };
    } catch {
      return EMPTY_LISTING_DRAFT;
    }
  });

  useEffect(() => {
    if (disabled || !storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // Ignore storage quota errors
    }
  }, [draft, storageKey, disabled]);

  const updateDraft = useCallback((patch: Partial<ListingFormDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(EMPTY_LISTING_DRAFT);
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore
      }
    }
  }, [storageKey]);

  const resetWithInitial = useCallback((initial: ListingFormDraft) => {
    setDraft(initial);
  }, []);

  return { draft, updateDraft, clearDraft, resetWithInitial };
}
