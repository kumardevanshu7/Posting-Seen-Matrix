import { UserProfile } from '../types';
import { db, isFirebaseConfigured } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROFILE_KEY_PREFIX = 'time_matrix_profile_';

export const userService = {
  /**
   * Fetches the user profile from local cache or Cloud Firestore.
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;

    // 1. Check local cache first for zero latency
    try {
      const cached = localStorage.getItem(`${PROFILE_KEY_PREFIX}${uid}`);
      if (cached) {
        return JSON.parse(cached) as UserProfile;
      }
    } catch (e) {
      console.warn('Failed to read profile from localStorage:', e);
    }

    // 2. Fetch from Cloud Firestore if available
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'users', uid);
        const snapshot = await getDoc(userDocRef);
        if (snapshot.exists()) {
          const profile = snapshot.data() as UserProfile;
          // Cache locally
          localStorage.setItem(`${PROFILE_KEY_PREFIX}${uid}`, JSON.stringify(profile));
          return profile;
        }
      } catch (err) {
        console.error('[Firestore] Failed to fetch user profile:', err);
      }
    }

    return null;
  },

  /**
   * Saves or updates the user profile in Cloud Firestore and local cache.
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!profile.uid) return;

    // 1. Persist locally
    try {
      localStorage.setItem(`${PROFILE_KEY_PREFIX}${profile.uid}`, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to cache profile in localStorage:', e);
    }

    // 2. Persist to Cloud Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'users', profile.uid);
        await setDoc(userDocRef, {
          ...profile,
          updated_at: new Date().toISOString(),
        }, { merge: true });
        console.log('[Firestore] User profile saved successfully:', profile.uid);
      } catch (err) {
        console.error('[Firestore] Failed to save user profile to cloud:', err);
        throw err;
      }
    }
  }
};
