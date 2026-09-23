import { UserProfile } from '../types';
import { db, isFirebaseConfigured } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROFILE_KEY_PREFIX = 'time_matrix_profile_';

export const userService = {
  /**
   * Fast synchronous read from local cache for zero-latency initial UI rendering.
   */
  getCachedProfile(uid: string): UserProfile | null {
    if (!uid) return null;
    try {
      const cached = localStorage.getItem(`${PROFILE_KEY_PREFIX}${uid}`);
      return cached ? (JSON.parse(cached) as UserProfile) : null;
    } catch {
      return null;
    }
  },

  /**
   * Fetches fresh user profile from Cloud Firestore, updating the local cache.
   * Falls back gracefully to local cache if offline or network request fails (stale-while-revalidate).
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;

    // 1. Read existing local cache for fallback
    let cachedProfile: UserProfile | null = null;
    try {
      const cached = localStorage.getItem(`${PROFILE_KEY_PREFIX}${uid}`);
      if (cached) {
        cachedProfile = JSON.parse(cached) as UserProfile;
      }
    } catch (e) {
      console.warn('Failed to read profile from localStorage:', e);
    }

    // 2. Always fetch fresh profile from Cloud Firestore if available
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'users', uid);
        const snapshot = await getDoc(userDocRef);
        if (snapshot.exists()) {
          const freshProfile = snapshot.data() as UserProfile;
          // Refresh local cache with latest data from cloud
          try {
            localStorage.setItem(`${PROFILE_KEY_PREFIX}${uid}`, JSON.stringify(freshProfile));
          } catch (storageErr) {
            console.warn('Failed to update localStorage with fresh profile:', storageErr);
          }
          return freshProfile;
        } else {
          // Document does not exist in Firestore: user has not completed onboarding on cloud
          return null;
        }
      } catch (err) {
        console.warn('[Firestore] Failed to fetch fresh profile from cloud, falling back to cache:', err);
        return cachedProfile;
      }
    }

    // Offline / Local-only fallback
    return cachedProfile;
  },

  /**
   * Saves or updates the user profile.
   * Writes to Cloud Firestore first to guarantee cloud consistency,
   * then updates local cache upon success (preventing false-positive local state).
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!profile.uid) return;

    const payload: UserProfile = {
      ...profile,
      updated_at: new Date().toISOString(),
    };

    // 1. Persist to Cloud Firestore first if configured
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'users', profile.uid);
        await setDoc(userDocRef, payload, { merge: true });
        console.log('[Firestore] User profile successfully committed to cloud:', profile.uid);
      } catch (err) {
        console.error('[Firestore] Failed to commit user profile to cloud:', err);
        throw err; // Propagate error so caller does not assume cloud save succeeded
      }
    }

    // 2. Persist to local cache only after cloud success (or in local mode)
    try {
      localStorage.setItem(`${PROFILE_KEY_PREFIX}${profile.uid}`, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to cache profile in localStorage:', e);
    }
  }
};
