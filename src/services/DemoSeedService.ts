/**
 * Demo Seed Data Service
 * Idempotently seeds 8 demonstration shelters across Indian cities and tags sample pets with is_demo = true.
 * Safe to execute multiple times (uses setDoc with merge: true).
 */

import { doc, setDoc, writeBatch, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import type { Shelter, ShelterPrivate } from '../domain/shelterEntities.js';

export interface DemoShelterSeedDefinition {
  shelter: Shelter;
  privateData: ShelterPrivate;
}

export const DEMO_SHELTERS: readonly DemoShelterSeedDefinition[] = [
  {
    shelter: {
      ownerId: 'demo_shelter_cbe',
      name: '[DEMO] Coimbatore Paws Animal Rescue',
      state: 'TAMIL_NADU',
      stateCode: 'TN',
      district: 'Coimbatore',
      area: 'RS Puram',
      animalTypes: ['DOG', 'CAT', 'COW'],
      description:
        'A dedicated demonstration animal rescue shelter in Coimbatore caring for injured street dogs, orphaned kittens, and community cattle with 24/7 emergency veterinary response.',
      urgency: 'URGENT',
      urgencyNote: 'Urgent requirement for puppy booster vaccines and rice meal bags.',
      verified: true,
      status: 'APPROVED',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: '2026-01-10T10:00:00.000Z',
      approvedAt: '2026-01-10T12:00:00.000Z',
      is_demo: true,
      isDemo: true,
      coverImage: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80',
    },
    privateData: {
      contactPerson: 'Karthik Raja (Demo Coordinator)',
      phone: '+919876543210',
      fullAddress: '124 DB Road, RS Puram, Coimbatore, Tamil Nadu 641002',
      upiId: 'demo-shelter1@upi',
      upiHolderName: '[DEMO] Coimbatore Paws Trust',
      registrationNumber: 'DEMO-TN-CBE-2024-001',
      supportLink: 'https://example.com/demo/cbe',
      statusReason: 'Approved as demonstration shelter.',
      consentAt: '2026-01-10T10:00:00.000Z',
    },
  },
  {
    shelter: {
      ownerId: 'demo_shelter_chennai',
      name: '[DEMO] Chennai Street Paws Sanctuary',
      state: 'TAMIL_NADU',
      stateCode: 'TN',
      district: 'Chennai',
      area: 'Mylapore',
      animalTypes: ['DOG', 'CAT'],
      description:
        'Demonstration shelter in Chennai providing sterilisation, vaccination, and loving hospice care for abandoned senior dogs and special-needs felines.',
      urgency: 'NORMAL',
      urgencyNote: 'Regular seasonal supply of anti-tick treatments and kitten formula.',
      verified: true,
      status: 'APPROVED',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: '2026-01-11T10:00:00.000Z',
      updatedAt: '2026-01-11T10:00:00.000Z',
      approvedAt: '2026-01-11T12:00:00.000Z',
      is_demo: true,
      isDemo: true,
      coverImage: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?auto=format&fit=crop&w=800&q=80',
    },
    privateData: {
      contactPerson: 'Meera Sundaram (Demo Volunteer)',
      phone: '+919876543211',
      fullAddress: '45 Luz Church Road, Mylapore, Chennai, Tamil Nadu 600004',
      upiId: 'demo-shelter2@upi',
      upiHolderName: '[DEMO] Chennai Street Paws Foundation',
      registrationNumber: 'DEMO-TN-CHN-2024-002',
      supportLink: 'https://example.com/demo/chennai',
      statusReason: 'Approved as demonstration shelter.',
      consentAt: '2026-01-11T10:00:00.000Z',
    },
  },
  {
    shelter: {
      ownerId: 'demo_shelter_kochi',
      name: '[DEMO] Kochi Coastal Animal Haven',
      state: 'KERALA',
      stateCode: 'KL',
      district: 'Ernakulam',
      area: 'Fort Kochi',
      animalTypes: ['DOG', 'CAT', 'BIRD'],
      description:
        'Demonstration animal rescue sanctuary near the Kerala coast offering medical rehabilitation, bird aviaries, and community neutering clinics.',
      urgency: 'CRITICAL',
      urgencyNote: 'Monsoon emergency shelter repair and clean drinking water filtration bowls needed.',
      verified: true,
      status: 'APPROVED',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: '2026-01-12T10:00:00.000Z',
      updatedAt: '2026-01-12T10:00:00.000Z',
      approvedAt: '2026-01-12T12:00:00.000Z',
      is_demo: true,
      isDemo: true,
      coverImage: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
    },
    privateData: {
      contactPerson: 'Thomas Varghese (Demo Officer)',
      phone: '+919876543212',
      fullAddress: '18 Peter Celli Street, Fort Kochi, Ernakulam, Kerala 682001',
      upiId: 'demo-shelter3@upi',
      upiHolderName: '[DEMO] Kochi Coastal Paws Trust',
      registrationNumber: 'DEMO-KL-EKM-2024-003',
      supportLink: 'https://example.com/demo/kochi',
      statusReason: 'Approved as demonstration shelter.',
      consentAt: '2026-01-12T10:00:00.000Z',
    },
  },
  {
    shelter: {
      ownerId: 'demo_shelter_tvm',
      name: '[DEMO] Trivandrum Companion Shelter',
      state: 'KERALA',
      stateCode: 'KL',
      district: 'Thiruvananthapuram',
      area: 'Kowdiar',
      animalTypes: ['DOG', 'CAT'],
      description:
        'Demonstration non-profit animal rescue home helping injured street animals across South Kerala with comprehensive trauma and post-surgery care.',
      urgency: 'NORMAL',
      urgencyNote: 'Ongoing medical care support for rehabilitated indie companions.',
      verified: true,
      status: 'APPROVED',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: '2026-01-13T10:00:00.000Z',
      updatedAt: '2026-01-13T10:00:00.000Z',
      approvedAt: '2026-01-13T12:00:00.000Z',
      is_demo: true,
      isDemo: true,
      coverImage: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    },
    privateData: {
      contactPerson: 'Anjali Nair (Demo Manager)',
      phone: '+919876543213',
      fullAddress: '88 Kowdiar Palace Road, Thiruvananthapuram, Kerala 695003',
      upiId: 'demo-shelter4@upi',
      upiHolderName: '[DEMO] Trivandrum Animal Care Trust',
      registrationNumber: 'DEMO-KL-TVM-2024-004',
      supportLink: 'https://example.com/demo/tvm',
      statusReason: 'Approved as demonstration shelter.',
      consentAt: '2026-01-13T10:00:00.000Z',
    },
  },
  {
    shelter: {
      ownerId: 'demo_shelter_madurai',
      name: '[DEMO] Madurai Heritage Pet Care',
      state: 'TAMIL_NADU',
      stateCode: 'TN',
      district: 'Madurai',
      area: 'KK Nagar',
      animalTypes: ['DOG', 'CAT', 'COW'],
      description:
        'Demonstration welfare shelter focused on traditional Indian native breeds, heatwave hydration bowls, and community animal birth control.',
      urgency: 'URGENT',
      urgencyNote: 'Urgent requirement for summer hydration tubs and reflective night-safety collars.',
      verified: true,
      status: 'APPROVED',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: '2026-01-14T10:00:00.000Z',
      updatedAt: '2026-01-14T10:00:00.000Z',
      approvedAt: '2026-01-14T12:00:00.000Z',
      is_demo: true,
      isDemo: true,
      coverImage: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    },
    privateData: {
      contactPerson: 'Senthil Kumar (Demo Officer)',
      phone: '+919876543214',
      fullAddress: '12 Lake View Road, KK Nagar, Madurai, Tamil Nadu 625020',
      upiId: 'demo-shelter5@upi',
      upiHolderName: '[DEMO] Madurai Heritage Shelter',
      registrationNumber: 'DEMO-TN-MDU-2024-005',
      supportLink: 'https://example.com/demo/madurai',
      statusReason: 'Approved as demonstration shelter.',
      consentAt: '2026-01-14T10:00:00.000Z',
    },
  },
  {
    shelter: {
      ownerId: 'demo_shelter_salem',
      name: '[DEMO] Salem Four-Legged Friends Care',
      state: 'TAMIL_NADU',
      stateCode: 'TN',
      district: 'Salem',
      area: 'Hasthampatti',
      animalTypes: ['DOG', 'CAT'],
      description:
        'Demonstration community rescue home rehabilitating paralyzed dogs, abandoned farm animals, and malnourished kittens.',
      urgency: 'NORMAL',
      urgencyNote: 'Daily meal support and joint care supplements for recovery wards.',
      verified: true,
      status: 'APPROVED',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
      approvedAt: '2026-01-15T12:00:00.000Z',
      is_demo: true,
      isDemo: true,
      coverImage: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80',
    },
    privateData: {
      contactPerson: 'Pooja Narayanan (Demo Incharge)',
      phone: '+919876543215',
      fullAddress: '77 Cherry Road, Hasthampatti, Salem, Tamil Nadu 636007',
      upiId: 'demo-shelter6@upi',
      upiHolderName: '[DEMO] Salem Friends Animal Trust',
      registrationNumber: 'DEMO-TN-SLM-2024-006',
      supportLink: 'https://example.com/demo/salem',
      statusReason: 'Approved as demonstration shelter.',
      consentAt: '2026-01-15T10:00:00.000Z',
    },
  },
  {
    shelter: {
      ownerId: 'demo_shelter_calicut',
      name: '[DEMO] Kozhikode Stray & Animal Rescue',
      state: 'KERALA',
      stateCode: 'KL',
      district: 'Kozhikode',
      area: 'Beach Road',
      animalTypes: ['DOG', 'CAT'],
      description:
        'Demonstration welfare group fostering rescue puppies, providing rabies inoculations, and operating ambulance transport.',
      urgency: 'URGENT',
      urgencyNote: 'Urgent emergency veterinary medications and suture supplies.',
      verified: true,
      status: 'APPROVED',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: '2026-01-16T10:00:00.000Z',
      updatedAt: '2026-01-16T10:00:00.000Z',
      approvedAt: '2026-01-16T12:00:00.000Z',
      is_demo: true,
      isDemo: true,
      coverImage: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    },
    privateData: {
      contactPerson: 'Rahul Nambiar (Demo Lead)',
      phone: '+919876543216',
      fullAddress: '31 Beach Road, Kozhikode, Kerala 673032',
      upiId: 'demo-shelter7@upi',
      upiHolderName: '[DEMO] Kozhikode Stray Welfare Guild',
      registrationNumber: 'DEMO-KL-CCJ-2024-007',
      supportLink: 'https://example.com/demo/calicut',
      statusReason: 'Approved as demonstration shelter.',
      consentAt: '2026-01-16T10:00:00.000Z',
    },
  },
  {
    shelter: {
      ownerId: 'demo_shelter_nilgiris',
      name: '[DEMO] Ooty & Nilgiris Animal Trust',
      state: 'TAMIL_NADU',
      stateCode: 'TN',
      district: 'The Nilgiris',
      area: 'Coonoor',
      animalTypes: ['DOG', 'CAT', 'HORSE'],
      description:
        'High-altitude demonstration rescue shelter protecting working equines, hill-station community indies, and abandoned mountain cats.',
      urgency: 'CRITICAL',
      urgencyNote: 'Winter thermal fleece bedding and high-calorie nutrition supplies needed urgently.',
      verified: true,
      status: 'APPROVED',
      statusVersion: 1,
      resubmitCount: 0,
      createdAt: '2026-01-17T10:00:00.000Z',
      updatedAt: '2026-01-17T10:00:00.000Z',
      approvedAt: '2026-01-17T12:00:00.000Z',
      is_demo: true,
      isDemo: true,
      coverImage: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=800&q=80',
    },
    privateData: {
      contactPerson: 'David Ross (Demo Administrator)',
      phone: '+919876543217',
      fullAddress: '9 Upper Coonoor Road, Coonoor, The Nilgiris, Tamil Nadu 643101',
      upiId: 'demo-shelter8@upi',
      upiHolderName: '[DEMO] Nilgiris Animal Trust',
      registrationNumber: 'DEMO-TN-NIL-2024-008',
      supportLink: 'https://example.com/demo/nilgiris',
      statusReason: 'Approved as demonstration shelter.',
      consentAt: '2026-01-17T10:00:00.000Z',
    },
  },
];

export class DemoSeedService {
  /**
   * Idempotent seeding method for shelters and sample pets
   */
  static async seedDemoSheltersAndPets(): Promise<{
    sheltersSeeded: number;
    petsUpdated: number;
  }> {
    try {
      const batch = writeBatch(db);

      // 1. Upsert all 8 demo shelters and payment info
      for (const item of DEMO_SHELTERS) {
        const shelterRef = doc(db, 'shelters', item.shelter.ownerId);
        const privateRef = doc(db, 'shelterPrivate', item.shelter.ownerId);
        const payInfoRef = doc(db, 'shelterPayInfo', item.shelter.ownerId);

        batch.set(shelterRef, item.shelter, { merge: true });
        batch.set(privateRef, item.privateData, { merge: true });
        batch.set(
          payInfoRef,
          {
            shelterId: item.shelter.ownerId,
            upiId: item.privateData.upiId,
            upiHolderName: item.privateData.upiHolderName,
            status: 'APPROVED',
            is_demo: true,
            isDemo: true,
          },
          { merge: true }
        );
      }

      // 2. Mark existing sample pets as demo
      const petsSnap = await getDocs(collection(db, 'pets'));
      let petsUpdated = 0;
      petsSnap.forEach((petDoc) => {
        const id = petDoc.id;
        const data = petDoc.data();
        if (
          id.startsWith('sample_pet_') ||
          data.is_demo === undefined ||
          data.isDemo === undefined
        ) {
          batch.update(petDoc.ref, {
            is_demo: true,
            isDemo: true,
          });
          petsUpdated++;
        }
      });

      await batch.commit();
      return { sheltersSeeded: DEMO_SHELTERS.length, petsUpdated };
    } catch (err) {
      console.warn('[DemoSeedService] Error seeding demo data:', err);
      return { sheltersSeeded: 0, petsUpdated: 0 };
    }
  }
}
