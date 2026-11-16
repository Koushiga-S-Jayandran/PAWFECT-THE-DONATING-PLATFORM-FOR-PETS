/**
 * Cloud Function Trigger: onAdoptionRequestUpdate
 * 
 * ============================================================================
 * STATUS: DEPLOYABLE ON FIREBASE BLAZE PLAN
 * ============================================================================
 * Listens for status transitions on `adoptionRequests/{requestId}` (approved / rejected).
 * Automatically delivers an in-app notification to the adopter at `users/{adopterId}/notifications/{id}`.
 * 
 * On Pawfect's Free Spark Plan, the application also maintains a client-side
 * transactional fallback to ensure adopters never miss an adoption status change.
 * 
 * TO DEPLOY:
 * 1. `firebase init functions`
 * 2. Deploy: `firebase deploy --only functions:onAdoptionRequestUpdate`
 * ============================================================================
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// When deployed with firebase-functions v2:
// import { onDocumentUpdated } from "firebase-functions/v2/firestore";
// import * as admin from "firebase-admin";

export const onAdoptionRequestUpdateConfig = {
  document: "adoptionRequests/{requestId}",
  region: "asia-south1",
};

/**
 * Cloud Function handler for adoption request updates
 */
export async function onAdoptionRequestUpdateHandler(event: any, adminFirestore: any) {
  const beforeData = event.data?.before?.data();
  const afterData = event.data?.after?.data();
  const requestId = event.params?.requestId;

  if (!beforeData || !afterData || !requestId) {
    return;
  }

  // Trigger only on status change to 'approved' or 'rejected'
  if (beforeData.status === afterData.status) {
    return;
  }

  const adopterId = afterData.adopterId;
  const petName = afterData.petName || 'your pet';
  const newStatus = afterData.status;

  if (!adopterId) {
    return;
  }

  // Idempotent notification ID
  const notificationId = `${requestId}_${newStatus}`;
  const notificationRef = adminFirestore
    .collection('users')
    .doc(adopterId)
    .collection('notifications')
    .doc(notificationId);

  let message = '';
  let type: 'adoption_approved' | 'adoption_rejected' | 'status_update' = 'status_update';

  if (newStatus === 'approved') {
    type = 'adoption_approved';
    message = `Congratulations! Your adoption application for ${petName} was approved. The shelter will be in touch with you shortly.`;
  } else if (newStatus === 'rejected') {
    type = 'adoption_rejected';
    const reasonText = afterData.statusReason ? ` Reason: ${afterData.statusReason}` : '';
    message = `Your adoption application for ${petName} was not approved.${reasonText}`;
  } else if (newStatus === 'cancelled') {
    type = 'status_update';
    message = `Your adoption application for ${petName} has been cancelled.`;
  } else {
    return;
  }

  await notificationRef.set(
    {
      id: notificationId,
      type,
      message,
      requestId,
      petId: afterData.petId,
      petName,
      read: false,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
