import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Attraction } from './types';

export const ATTRACTIONS_COLLECTION = 'attractions';

function initAdmin() {
  if (getApps().length) return;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS / ADC when deployed, and
    // to FIRESTORE_EMULATOR_HOST automatically when set for local dev.
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  }
}

/** Fetched once at build time (this is a static Astro site) and handed to the client island as props. */
export async function getAllAttractions(): Promise<Attraction[]> {
  initAdmin();
  const snapshot = await getFirestore().collection(ATTRACTIONS_COLLECTION).get();
  return snapshot.docs.map((doc) => doc.data() as Attraction);
}
