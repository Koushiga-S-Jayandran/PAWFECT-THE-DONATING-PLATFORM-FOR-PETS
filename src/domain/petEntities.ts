/**
 * Pet Adoption Domain Entities & Interfaces
 * Strict TypeScript types for pets, adoption requests, favorites, and notifications.
 */

export type PetSpecies = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
export type PetGender = 'male' | 'female';
export type PetSize = 'small' | 'medium' | 'large';
export type PetStatus = 'available' | 'pending' | 'adopted';

export interface Pet {
  id: string;
  shelterId: string;
  shelterName: string;
  shelterCity: string;
  shelterApproved: boolean; // Denormalized flag from shelters/{uid}
  name: string;
  species: PetSpecies;
  breed: string;
  ageMonths: number;
  gender: PetGender;
  size: PetSize;
  color: string;
  description: string;
  vaccinated: boolean;
  neutered: boolean;
  temperament: string[];
  photos: string[];
  status: PetStatus;
  createdAt: string;
  updatedAt: string;
  is_demo?: boolean;
  isDemo?: boolean;
}

export type AdoptionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type HousingType = 'own_apartment' | 'rent_apartment' | 'own_house' | 'rent_house';

export interface AdoptionRequest {
  id: string; // Deterministic: `${adopterId}_${petId}`
  petId: string;
  petName: string;
  shelterId: string;
  adopterId: string;
  adopterName: string;
  adopterPhone: string;
  adopterEmail: string;
  reason: string;
  housingType: HousingType;
  ownsHome: boolean;
  landlordPermission: boolean;
  hasYard: boolean;
  hasOtherPets: boolean;
  otherPetsDetail?: string;
  experience: string;
  status: AdoptionRequestStatus;
  statusReason?: string;
  statusUpdatedAt: string;
  createdAt: string;
}

export interface FavoriteItem {
  petId: string;
  createdAt: string;
}

export interface AdopterNotification {
  id: string; // Idempotent: `${requestId}_${status}`
  type: 'adoption_approved' | 'adoption_rejected' | 'status_update';
  message: string;
  requestId: string;
  petId?: string;
  petName?: string;
  read: boolean;
  createdAt: string;
}

export interface AdopterProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: 'adopter';
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PetFilterCriteria {
  species?: PetSpecies;
  breed?: string;
  ageRange?: 'puppy_kitten' | 'young' | 'adult' | 'senior';
  gender?: PetGender;
  size?: PetSize;
  city?: string;
  vaccinated?: boolean;
  searchQuery?: string;
  sortBy?: 'newest' | 'youngest' | 'oldest';
}
