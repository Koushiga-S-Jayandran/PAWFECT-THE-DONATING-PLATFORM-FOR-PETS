/**
 * Firestore UserProfile Repository Implementation
 * Strictly adheres to Zero-Trust ABAC security boundaries.
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase.js';
import type { UserProfile } from '../domain/entities.js';
import type { UserProfileRepository } from '../domain/interfaces.js';

export class FirebaseUserProfileRepository implements UserProfileRepository {
  async createProfile(profile: UserProfile): Promise<void> {
    const path = `users/${profile.uid}`;
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        fullName: profile.fullName,
        phone: profile.phone,
        consentAt: profile.consentAt,
        consentVersion: profile.consentVersion,
        role: 'DONOR',
        createdAt: profile.createdAt,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async getProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data();
      return {
        uid,
        fullName: data.fullName,
        phone: data.phone,
        consentAt: data.consentAt,
        consentVersion: data.consentVersion,
        role: data.role,
        createdAt: data.createdAt,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async updateProfile(
    uid: string,
    data: Partial<Pick<UserProfile, 'fullName' | 'phone'>>
  ): Promise<void> {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}
