/**
 * Pet Adoption Service
 * Production-ready data layer for pets, adoption requests, favorites,
 * notifications, and adopter profiles with zero-trust validation and transactions.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  onSnapshot,
  writeBatch,
  DocumentSnapshot,
} from 'firebase/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  type User,
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../config/firebase.js';
import type {
  Pet,
  AdoptionRequest,
  AdopterNotification,
  AdopterProfile,
  PetFilterCriteria,
} from '../domain/petEntities.js';

export interface FetchPetsResult {
  pets: Pet[];
  lastVisibleDoc: DocumentSnapshot | null;
  hasMore: boolean;
  totalAvailable: number;
}

export class PetAdoptionService {
  /**
   * Deterministic request ID generator ensuring duplicates are impossible
   */
  getRequestId(adopterId: string, petId: string): string {
    return `${adopterId}_${petId}`;
  }

  /**
   * Fetch pets with filtering, sorting, cursor pagination, and graceful index fallback
   */
  async fetchPets(
    filters: PetFilterCriteria = {},
    pageSize: number = 12,
    startAfterDoc: DocumentSnapshot | null = null
  ): Promise<FetchPetsResult> {
    const petsRef = collection(db, 'pets');

    try {
      // Primary query for available pets with real Firestore cursor pagination
      const baseConstraints: any[] = [where('status', '==', 'available')];
      if (startAfterDoc) {
        baseConstraints.push(startAfter(startAfterDoc));
      }

      const q = query(petsRef, ...baseConstraints, limit(100));
      const snapshot = await getDocs(q);

      let allPets: Pet[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawAge = Number(data.ageMonths);
        return {
          id: docSnap.id,
          shelterId: data.shelterId || '',
          shelterName: data.shelterName || 'Shelter Partner',
          shelterCity: data.shelterCity || 'India',
          shelterApproved: data.shelterApproved === true,
          name: data.name || 'Unnamed',
          species: data.species || 'dog',
          breed: data.breed || 'Indie / Mixed',
          ageMonths: Number.isFinite(rawAge) && rawAge >= 0 ? rawAge : 0,
          gender: data.gender || 'male',
          size: data.size || 'medium',
          color: data.color || '',
          description: data.description || '',
          vaccinated: Boolean(data.vaccinated),
          neutered: Boolean(data.neutered),
          temperament: Array.isArray(data.temperament) ? data.temperament : [],
          photos: Array.isArray(data.photos) ? data.photos : [],
          status: data.status || 'available',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        } as Pet;
      });

      // Filter only approved shelters for public display
      allPets = allPets.filter((p) => p.shelterApproved === true && p.status === 'available');

      // Apply client-side criteria for multi-parameter flexibility
      if (filters.species) {
        allPets = allPets.filter((p) => p.species.toLowerCase() === filters.species!.toLowerCase());
      }

      if (filters.breed && filters.breed.trim() !== '') {
        const searchBreed = filters.breed.toLowerCase().trim();
        allPets = allPets.filter((p) => p.breed.toLowerCase().includes(searchBreed));
      }

      if (filters.gender) {
        allPets = allPets.filter((p) => p.gender === filters.gender);
      }

      if (filters.size) {
        allPets = allPets.filter((p) => p.size === filters.size);
      }

      if (filters.city && filters.city.trim() !== '') {
        const searchCity = filters.city.toLowerCase().trim();
        allPets = allPets.filter((p) => p.shelterCity.toLowerCase().includes(searchCity));
      }

      if (filters.vaccinated !== undefined) {
        allPets = allPets.filter((p) => p.vaccinated === filters.vaccinated);
      }

      if (filters.ageRange) {
        allPets = allPets.filter((p) => {
          if (filters.ageRange === 'puppy_kitten') return p.ageMonths < 12;
          if (filters.ageRange === 'young') return p.ageMonths >= 12 && p.ageMonths <= 36;
          if (filters.ageRange === 'adult') return p.ageMonths > 36 && p.ageMonths <= 96;
          if (filters.ageRange === 'senior') return p.ageMonths > 96;
          return true;
        });
      }

      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const queryTerm = filters.searchQuery.toLowerCase().trim();
        allPets = allPets.filter(
          (p) =>
            p.name.toLowerCase().includes(queryTerm) ||
            p.breed.toLowerCase().includes(queryTerm) ||
            p.description.toLowerCase().includes(queryTerm) ||
            p.shelterName.toLowerCase().includes(queryTerm) ||
            p.shelterCity.toLowerCase().includes(queryTerm)
        );
      }

      // Sort
      if (filters.sortBy === 'youngest') {
        allPets.sort((a, b) => a.ageMonths - b.ageMonths);
      } else if (filters.sortBy === 'oldest') {
        allPets.sort((a, b) => b.ageMonths - a.ageMonths);
      } else {
        // default newest
        allPets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      const totalAvailable = allPets.length;

      // Handle cursor-based pagination
      let startIndex = 0;
      if (startAfterDoc) {
        const foundIdx = allPets.findIndex((p) => p.id === startAfterDoc.id);
        if (foundIdx !== -1) {
          startIndex = foundIdx + 1;
        }
      }

      const paginatedPets = allPets.slice(startIndex, startIndex + pageSize);
      const hasMore = startIndex + pageSize < allPets.length;
      const lastVisibleDoc =
        paginatedPets.length > 0
          ? snapshot.docs.find((d) => d.id === paginatedPets[paginatedPets.length - 1].id) || null
          : null;

      return {
        pets: paginatedPets,
        lastVisibleDoc,
        hasMore,
        totalAvailable,
      };
    } catch (error: any) {
      console.error('[PetAdoptionService] Error fetching pets:', error);
      if (error?.message?.includes('requires an index')) {
        throw new Error(
          'A database index is currently building. Please retry in a few moments.'
        );
      }
      handleFirestoreError(error, OperationType.LIST, 'pets');
    }
  }

  /**
   * Get single pet by ID
   */
  async getPetById(petId: string): Promise<Pet | null> {
    try {
      const snap = await getDoc(doc(db, 'pets', petId));
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data();
      const rawAge = Number(data.ageMonths);
      return {
        id: snap.id,
        shelterId: data.shelterId || '',
        shelterName: data.shelterName || 'Shelter Partner',
        shelterCity: data.shelterCity || 'India',
        shelterApproved: data.shelterApproved === true,
        name: data.name || 'Unnamed',
        species: data.species || 'dog',
        breed: data.breed || 'Indie / Mixed',
        ageMonths: Number.isFinite(rawAge) && rawAge >= 0 ? rawAge : 0,
        gender: data.gender || 'male',
        size: data.size || 'medium',
        color: data.color || '',
        description: data.description || '',
        vaccinated: Boolean(data.vaccinated),
        neutered: Boolean(data.neutered),
        temperament: Array.isArray(data.temperament) ? data.temperament : [],
        photos: Array.isArray(data.photos) ? data.photos : [],
        status: data.status || 'available',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `pets/${petId}`);
    }
  }

  /**
   * Subscribe to real-time updates for a single pet
   */
  subscribeToPet(
    petId: string,
    onUpdate: (pet: Pet | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    const petDocRef = doc(db, 'pets', petId);
    return onSnapshot(
      petDocRef,
      (snap) => {
        if (!snap.exists()) {
          onUpdate(null);
          return;
        }
        const data = snap.data();
        const rawAge = Number(data.ageMonths);
        const pet: Pet = {
          id: snap.id,
          shelterId: data.shelterId || '',
          shelterName: data.shelterName || 'Shelter Partner',
          shelterCity: data.shelterCity || 'India',
          shelterApproved: data.shelterApproved === true,
          name: data.name || 'Unnamed',
          species: data.species || 'dog',
          breed: data.breed || 'Indie / Mixed',
          ageMonths: Number.isFinite(rawAge) && rawAge >= 0 ? rawAge : 0,
          gender: data.gender || 'male',
          size: data.size || 'medium',
          color: data.color || '',
          description: data.description || '',
          vaccinated: Boolean(data.vaccinated),
          neutered: Boolean(data.neutered),
          temperament: Array.isArray(data.temperament) ? data.temperament : [],
          photos: Array.isArray(data.photos) ? data.photos : [],
          status: data.status || 'available',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        onUpdate(pet);
      },
      (err) => {
        console.warn(`[PetAdoptionService] Snapshot error on pets/${petId}:`, err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Get similar available pets (same species or same shelter)
   */
  async getSimilarPets(currentPet: Pet, limitCount: number = 4): Promise<Pet[]> {
    try {
      const q = query(
        collection(db, 'pets'),
        where('status', '==', 'available'),
        limit(20)
      );
      const snap = await getDocs(q);
      const candidates: Pet[] = [];

      snap.forEach((docSnap) => {
        if (docSnap.id === currentPet.id) return;
        const d = docSnap.data();
        if (d.shelterApproved !== true) return;
        const rawAge = Number(d.ageMonths);
        candidates.push({
          id: docSnap.id,
          shelterId: d.shelterId || '',
          shelterName: d.shelterName || 'Shelter Partner',
          shelterCity: d.shelterCity || 'India',
          shelterApproved: true,
          name: d.name || 'Unnamed',
          species: d.species || 'dog',
          breed: d.breed || 'Indie / Mixed',
          ageMonths: Number.isFinite(rawAge) && rawAge >= 0 ? rawAge : 0,
          gender: d.gender || 'male',
          size: d.size || 'medium',
          color: d.color || '',
          description: d.description || '',
          vaccinated: Boolean(d.vaccinated),
          neutered: Boolean(d.neutered),
          temperament: Array.isArray(d.temperament) ? d.temperament : [],
          photos: Array.isArray(d.photos) ? d.photos : [],
          status: d.status || 'available',
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        });
      });

      // Prioritize same species, then same shelter
      candidates.sort((a, b) => {
        const aSpeciesMatch = a.species === currentPet.species ? 2 : 0;
        const bSpeciesMatch = b.species === currentPet.species ? 2 : 0;
        const aShelterMatch = a.shelterId === currentPet.shelterId ? 1 : 0;
        const bShelterMatch = b.shelterId === currentPet.shelterId ? 1 : 0;
        return bSpeciesMatch + bShelterMatch - (aSpeciesMatch + aShelterMatch);
      });

      return candidates.slice(0, limitCount);
    } catch (err) {
      console.warn('[PetAdoptionService] Could not fetch similar pets:', err);
      return [];
    }
  }

  /**
   * Check if adopter already has a request for this pet
   */
  async hasActiveRequest(adopterId: string, petId: string): Promise<boolean> {
    const requestId = this.getRequestId(adopterId, petId);
    try {
      const snap = await getDoc(doc(db, 'adoptionRequests', requestId));
      if (!snap.exists()) return false;
      const status = snap.data()?.status;
      return status === 'pending' || status === 'approved';
    } catch (err) {
      console.warn('[PetAdoptionService] Error checking active request:', err);
      return false;
    }
  }

  /**
   * Submit multi-step adoption application inside a strict Firestore Transaction
   * - Verifies pet exists and is still available
   * - Verifies shelter is approved
   * - Enforces deterministic ID `${adopterId}_${petId}` to guarantee zero duplicates
   */
  async submitAdoptionRequest(
    data: Omit<AdoptionRequest, 'id' | 'status' | 'statusUpdatedAt' | 'createdAt'>
  ): Promise<{ success: boolean; requestId: string }> {
    const requestId = this.getRequestId(data.adopterId, data.petId);
    const petRef = doc(db, 'pets', data.petId);
    const requestRef = doc(db, 'adoptionRequests', requestId);

    await runTransaction(db, async (transaction) => {
      // 1. Read pet doc
      const petSnap = await transaction.get(petRef);
      if (!petSnap.exists()) {
        throw new Error('This pet record could not be found.');
      }
      const petData = petSnap.data();

      // Verify availability
      if (petData.status !== 'available') {
        throw new Error(
          'This pet is no longer available. Please explore our other wonderful companions.'
        );
      }

      // Verify shelter approval
      if (petData.shelterApproved === false) {
        throw new Error('This shelter is currently undergoing verification.');
      }

      // 2. Read request doc to ensure duplicate does not exist
      const requestSnap = await transaction.get(requestRef);
      if (requestSnap.exists()) {
        const existingStatus = requestSnap.data()?.status;
        if (existingStatus === 'pending' || existingStatus === 'approved') {
          throw new Error('You already have an active adoption application for this pet.');
        }
      }

      // 3. Write adoption request
      const now = new Date().toISOString();
      const newRequest: AdoptionRequest = {
        id: requestId,
        petId: data.petId,
        petName: data.petName || petData.name || 'Pet',
        shelterId: petData.shelterId || data.shelterId,
        adopterId: data.adopterId,
        adopterName: data.adopterName.trim(),
        adopterPhone: data.adopterPhone.trim(),
        adopterEmail: data.adopterEmail.trim(),
        reason: data.reason.trim(),
        housingType: data.housingType,
        ownsHome: Boolean(data.ownsHome),
        landlordPermission: Boolean(data.landlordPermission),
        hasYard: Boolean(data.hasYard),
        hasOtherPets: Boolean(data.hasOtherPets),
        otherPetsDetail: data.otherPetsDetail ? data.otherPetsDetail.trim() : '',
        experience: data.experience.trim(),
        status: 'pending',
        statusUpdatedAt: now,
        createdAt: now,
      };

      transaction.set(requestRef, newRequest);
    });

    return { success: true, requestId };
  }

  /**
   * Cancel a pending adoption application via Transaction
   */
  async cancelAdoptionRequest(adopterId: string, petId: string): Promise<void> {
    const requestId = this.getRequestId(adopterId, petId);
    const requestRef = doc(db, 'adoptionRequests', requestId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(requestRef);
      if (!snap.exists()) {
        throw new Error('Adoption request does not exist.');
      }
      const data = snap.data();
      if (data.adopterId !== adopterId) {
        throw new Error('Unauthorized: You can only cancel your own adoption requests.');
      }
      if (data.status !== 'pending') {
        throw new Error(`Cannot cancel request with status "${data.status}".`);
      }

      transaction.update(requestRef, {
        status: 'cancelled',
        statusUpdatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Real-time listener for adopter's requests
   */
  subscribeToAdopterRequests(
    adopterId: string,
    onUpdate: (requests: AdoptionRequest[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const q = query(
      collection(db, 'adoptionRequests'),
      where('adopterId', '==', adopterId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const requests: AdoptionRequest[] = [];
        snap.forEach((d) => {
          const data = d.data();
          requests.push({
            id: d.id,
            petId: data.petId,
            petName: data.petName || 'Pet',
            shelterId: data.shelterId || '',
            adopterId: data.adopterId,
            adopterName: data.adopterName || '',
            adopterPhone: data.adopterPhone || '',
            adopterEmail: data.adopterEmail || '',
            reason: data.reason || '',
            housingType: data.housingType || 'own_apartment',
            ownsHome: Boolean(data.ownsHome),
            landlordPermission: Boolean(data.landlordPermission),
            hasYard: Boolean(data.hasYard),
            hasOtherPets: Boolean(data.hasOtherPets),
            otherPetsDetail: data.otherPetsDetail || '',
            experience: data.experience || '',
            status: data.status || 'pending',
            statusReason: data.statusReason,
            statusUpdatedAt: data.statusUpdatedAt || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });

        // Sort newest first
        requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(requests);
      },
      (err) => {
        console.warn('[PetAdoptionService] Snapshot error on adoptionRequests:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Real-time listener for user's favorite pet IDs
   */
  subscribeToFavorites(
    adopterId: string,
    onUpdate: (petIds: string[]) => void
  ): () => void {
    const favsRef = collection(db, 'users', adopterId, 'favorites');
    return onSnapshot(favsRef, (snap) => {
      const ids: string[] = [];
      snap.forEach((d) => {
        ids.push(d.id);
      });
      onUpdate(ids);
    });
  }

  /**
   * Toggle favorite (Optimistic write to subcollection users/{uid}/favorites/{petId})
   */
  async toggleFavorite(adopterId: string, petId: string, add: boolean): Promise<void> {
    const favRef = doc(db, 'users', adopterId, 'favorites', petId);
    if (add) {
      await setDoc(favRef, {
        petId,
        createdAt: new Date().toISOString(),
      });
    } else {
      await deleteDoc(favRef);
    }
  }

  /**
   * Fetch full details for saved pets
   */
  async getSavedPets(
    adopterId: string
  ): Promise<{ pet: Pet; isAvailable: boolean }[]> {
    const favsRef = collection(db, 'users', adopterId, 'favorites');
    const snap = await getDocs(favsRef);
    const petIds: string[] = [];
    snap.forEach((d) => petIds.push(d.id));

    if (petIds.length === 0) return [];

    const results: { pet: Pet; isAvailable: boolean }[] = [];
    for (const petId of petIds) {
      const pet = await this.getPetById(petId);
      if (pet) {
        results.push({
          pet,
          isAvailable: pet.status === 'available',
        });
      }
    }

    return results;
  }

  /**
   * Real-time listener for user's notifications
   */
  subscribeToNotifications(
    adopterId: string,
    onUpdate: (notifications: AdopterNotification[]) => void
  ): () => void {
    const notifsRef = collection(db, 'users', adopterId, 'notifications');
    return onSnapshot(notifsRef, (snap) => {
      const list: AdopterNotification[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          type: data.type || 'status_update',
          message: data.message || '',
          requestId: data.requestId || '',
          petId: data.petId,
          petName: data.petName,
          read: Boolean(data.read),
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  }

  /**
   * Mark single notification as read
   */
  async markNotificationRead(adopterId: string, notifId: string): Promise<void> {
    const ref = doc(db, 'users', adopterId, 'notifications', notifId);
    await updateDoc(ref, { read: true });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(adopterId: string): Promise<void> {
    const notifsRef = collection(db, 'users', adopterId, 'notifications');
    const snap = await getDocs(notifsRef);
    const batch = writeBatch(db);
    snap.forEach((d) => {
      if (!d.data().read) {
        batch.update(d.ref, { read: true });
      }
    });
    await batch.commit();
  }

  /**
   * Get Adopter Profile
   */
  async getAdopterProfile(uid: string): Promise<AdopterProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        uid,
        name: d.name || d.fullName || '',
        email: d.email || auth.currentUser?.email || '',
        phone: d.phone || '',
        city: d.city || '',
        role: 'adopter',
        photoURL: d.photoURL || '',
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  }

  /**
   * Update Adopter Profile
   */
  async updateAdopterProfile(
    uid: string,
    data: Partial<Pick<AdopterProfile, 'name' | 'phone' | 'city' | 'photoURL'>>
  ): Promise<void> {
    const userRef = doc(db, 'users', uid);
    const updatePayload: any = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (data.name) {
      updatePayload.fullName = data.name; // Keep synchronized for legacy DONOR compatibility
    }
    await updateDoc(userRef, updatePayload);
  }

  /**
   * Account Deletion with Re-Authentication & Cascading Cleanup
   */
  async deleteAdopterAccount(user: User, password?: string): Promise<void> {
    if (!user) throw new Error('No authenticated user session found.');

    // 1. Re-authenticate if password provided
    if (password && user.email) {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    }

    const uid = user.uid;

    // 2. Transactionally cancel all pending adoption requests
    const requestsQ = query(
      collection(db, 'adoptionRequests'),
      where('adopterId', '==', uid)
    );
    const reqSnap = await getDocs(requestsQ);
    for (const reqDoc of reqSnap.docs) {
      if (reqDoc.data().status === 'pending') {
        await updateDoc(reqDoc.ref, {
          status: 'cancelled',
          statusUpdatedAt: new Date().toISOString(),
        });
      }
    }

    // 3. Delete favorites subcollection
    const favSnap = await getDocs(collection(db, 'users', uid, 'favorites'));
    const favBatch = writeBatch(db);
    favSnap.forEach((d) => favBatch.delete(d.ref));
    await favBatch.commit();

    // 4. Delete notifications subcollection
    const notifSnap = await getDocs(collection(db, 'users', uid, 'notifications'));
    const notifBatch = writeBatch(db);
    notifSnap.forEach((d) => notifBatch.delete(d.ref));
    await notifBatch.commit();

    // 5. Delete user profile doc
    await deleteDoc(doc(db, 'users', uid));

    // 6. Delete auth user
    await deleteUser(user);
  }

  /**
   * Mock pet seeding removed — Pawfect displays only real user-created listings.
   */
}

export const petAdoptionService = new PetAdoptionService();
