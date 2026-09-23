import { Post, PostType, ExternalSignal } from '../types';
import { db, auth, subscribeToAuth, isFirebaseConfigured } from '../config/firebase';
import { supabase, supabaseConfig, isSupabaseConfigured } from '../config/supabase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';

const STORAGE_KEY_POSTS = 'time_matrix_posts_v3';
const STORAGE_KEY_SIGNALS = 'time_matrix_signals_v3';
const STORAGE_KEY_DELETED_POSTS = 'time_matrix_deleted_posts_v3';
const STORAGE_KEY_DELETED_SIGNALS = 'time_matrix_deleted_signals_v3';

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

class StorageService {
  private posts: Post[] = [];
  private signals: ExternalSignal[] = [];
  private deletedPostIds: Set<string> = new Set();
  private deletedSignalIds: Set<string> = new Set();
  private listeners: Array<() => void> = [];
  private currentUserId: string | null = null;
  private unsubscribeFirestorePosts: (() => void) | null = null;
  private unsubscribeFirestoreSignals: (() => void) | null = null;
  private unsubscribeAuth: (() => void) | null = null;
  private _snapshotLock = false; // Mutex: prevents concurrent async snapshot handlers from racing


  constructor() {
    this.loadFromLocal();
    if (isSupabaseConfigured()) {
      this.purgeOrphanedThumbnails().catch(() => {});
    }
    if (isFirebaseConfigured() && db) {
      // Listen to auth state to scope Firestore queries strictly to authenticated creator
      this.unsubscribeAuth = subscribeToAuth((user) => {
        const newUid = user ? user.uid : null;
        if (newUid !== this.currentUserId) {
          this.detachFirestoreListeners();
          this.currentUserId = newUid;
          if (newUid) {
            this.initFirestoreSync(newUid);
          } else {
            // User signed out: clear active memory & local storage to avoid data leakage across accounts
            this.posts = [];
            this.signals = [];
            this.persistLocal();
          }
        }
      });
    }
  }

  private loadFromLocal() {
    try {
      const storedPosts = localStorage.getItem(STORAGE_KEY_POSTS);
      const storedSignals = localStorage.getItem(STORAGE_KEY_SIGNALS);
      const storedDeletedPosts = localStorage.getItem(STORAGE_KEY_DELETED_POSTS);
      const storedDeletedSignals = localStorage.getItem(STORAGE_KEY_DELETED_SIGNALS);

      this.deletedPostIds = storedDeletedPosts ? new Set(JSON.parse(storedDeletedPosts)) : new Set();
      this.deletedSignalIds = storedDeletedSignals ? new Set(JSON.parse(storedDeletedSignals)) : new Set();

      const rawPosts: Post[] = storedPosts ? JSON.parse(storedPosts) : [];
      const rawSignals: ExternalSignal[] = storedSignals ? JSON.parse(storedSignals) : [];

      this.posts = rawPosts.filter(p => !this.deletedPostIds.has(p.post_id));
      this.signals = rawSignals.filter(s => !this.deletedSignalIds.has(s.signal_id));
    } catch (e) {
      console.error('Failed to load local storage:', e);
      this.posts = [];
      this.signals = [];
      this.deletedPostIds = new Set();
      this.deletedSignalIds = new Set();
    }
  }

  private persistDeleted() {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_POSTS, JSON.stringify(Array.from(this.deletedPostIds)));
      localStorage.setItem(STORAGE_KEY_DELETED_SIGNALS, JSON.stringify(Array.from(this.deletedSignalIds)));
    } catch (e) {
      console.error('Failed to persist tombstones:', e);
    }
  }

  private persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(this.posts));
      localStorage.setItem(STORAGE_KEY_SIGNALS, JSON.stringify(this.signals));
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
    }
    this.notify();
  }

  private detachFirestoreListeners() {
    this._snapshotLock = false;
    if (this.unsubscribeFirestorePosts) {
      this.unsubscribeFirestorePosts();
      this.unsubscribeFirestorePosts = null;
    }
    if (this.unsubscribeFirestoreSignals) {
      this.unsubscribeFirestoreSignals();
      this.unsubscribeFirestoreSignals = null;
    }
  }

  private initFirestoreSync(uid: string) {
    if (!db || !uid) return;
    const firestoreDb = db;

    try {
      // 1. Realtime listener for posts strictly scoped to authenticated user
      const postsCol = collection(firestoreDb, 'posts');
      const postsQuery = query(postsCol, where('user_id', '==', uid));

      this.unsubscribeFirestorePosts = onSnapshot(postsQuery, async (snapshot) => {
        // Serialize snapshot processing — prevents concurrent snapshots from racing
        // and overwriting each other's post list (resurrection bug)
        while (this._snapshotLock) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        this._snapshotLock = true;

        try {
          const remotePosts: Post[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Post;
            const pid = data.post_id || d.id;

            // Reload tombstone from localStorage to get freshest state before every snapshot
            const rawDeleted = localStorage.getItem(STORAGE_KEY_DELETED_POSTS);
            if (rawDeleted) {
              try {
                const arr: string[] = JSON.parse(rawDeleted);
                arr.forEach(id => this.deletedPostIds.add(id));
              } catch {}
            }

            // If this post was marked as deleted locally, immediately purge it from cloud and skip
            if (this.deletedPostIds.has(pid) || this.deletedPostIds.has(d.id)) {
              console.log(`[Firestore] Purging zombie post from cloud: ${pid}`);
              deleteDoc(d.ref).catch(() => {});
              return;
            }

            remotePosts.push({ ...data, post_id: pid });
          });

          // Merge logic: index remote posts by post_id
          const remoteMap = new Map<string, Post>(remotePosts.map(p => [p.post_id, p]));

          // Check if there are local posts that don't exist in Firestore (never backfill deleted posts!)
          const unSyncedLocalPosts = this.posts.filter(localPost =>
            !remoteMap.has(localPost.post_id) && !this.deletedPostIds.has(localPost.post_id)
          );

          // Backfill local posts to Cloud Firestore tagged with this user's UID
          if (unSyncedLocalPosts.length > 0 && isFirebaseConfigured()) {
            console.log(`[Firestore] Preserving & backfilling ${unSyncedLocalPosts.length} local posts to Cloud Firestore for user ${uid}...`);
            for (const localPost of unSyncedLocalPosts) {
              try {
                if (!localPost.user_id) localPost.user_id = uid;
                if (localPost.user_id === uid && !this.deletedPostIds.has(localPost.post_id)) {
                  await setDoc(doc(firestoreDb, 'posts', localPost.post_id), sanitizeForFirestore(localPost));
                  remoteMap.set(localPost.post_id, localPost);
                }
              } catch (syncErr) {
                console.warn('[Firestore] Failed to backfill local post:', localPost.post_id, syncErr);
              }
            }
          }

          // Combined post list sorted descending by IST posted_at (strictly filtered against tombstones)
          this.posts = Array.from(remoteMap.values())
            .filter(p => !this.deletedPostIds.has(p.post_id))
            .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
          this.persistLocal();
        } finally {
          this._snapshotLock = false;
        }
      }, (error) => {
        this._snapshotLock = false;
        console.warn('[Firestore] Posts listener fallback to local:', error);
      });


      // 2. Realtime listener for external signals strictly scoped to authenticated user
      const signalsCol = collection(firestoreDb, 'external_signals');
      const signalsQuery = query(signalsCol, where('user_id', '==', uid));

      this.unsubscribeFirestoreSignals = onSnapshot(signalsQuery, async (snapshot) => {
        const remoteSignals: ExternalSignal[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as ExternalSignal;
          const sid = data.signal_id || d.id;

          if (this.deletedSignalIds.has(sid) || this.deletedSignalIds.has(d.id)) {
            console.log(`[Firestore] Purging zombie signal from cloud: ${sid}`);
            deleteDoc(d.ref).catch(() => {});
            return;
          }

          remoteSignals.push({
            ...data,
            signal_id: sid,
          });
        });

        const remoteMap = new Map<string, ExternalSignal>(remoteSignals.map(s => [s.signal_id, s]));
        const unSyncedLocalSignals = this.signals.filter(localSig => 
          !remoteMap.has(localSig.signal_id) && !this.deletedSignalIds.has(localSig.signal_id)
        );

        if (unSyncedLocalSignals.length > 0 && isFirebaseConfigured()) {
          console.log(`[Firestore] Preserving & backfilling ${unSyncedLocalSignals.length} local signals to Cloud Firestore for user ${uid}...`);
          for (const localSig of unSyncedLocalSignals) {
            try {
              if (!localSig.user_id) {
                localSig.user_id = uid;
              }
              if (localSig.user_id === uid && !this.deletedSignalIds.has(localSig.signal_id)) {
                await setDoc(doc(firestoreDb, 'external_signals', localSig.signal_id), sanitizeForFirestore(localSig));
                remoteMap.set(localSig.signal_id, localSig);
              }
            } catch (syncErr) {
              console.warn('[Firestore] Failed to backfill local signal:', localSig.signal_id, syncErr);
            }
          }
        }

        this.signals = Array.from(remoteMap.values())
          .filter(s => !this.deletedSignalIds.has(s.signal_id))
          .sort((a, b) => new Date(b.week_of).getTime() - new Date(a.week_of).getTime());
        this.persistLocal();
      }, (error) => {
        console.warn('[Firestore] Signals listener fallback to local:', error);
      });

    } catch (err) {
      console.warn('[Firestore] Sync init error, using local-first storage:', err);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  // --- Post Methods ---

  public getPosts(postType?: PostType): Post[] {
    const active = this.posts.filter(p => !this.deletedPostIds.has(p.post_id));
    if (postType) {
      return active
        .filter(p => p.post_type === postType)
        .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
    }
    return [...active].sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
  }

  public getPostById(postId: string): Post | undefined {
    if (this.deletedPostIds.has(postId)) return undefined;
    return this.posts.find(p => p.post_id === postId);
  }

  /**
   * Logs a new post.
   * Stored in Cloud Firestore and mirrored locally.
   */
  public async addPost(post: Omit<Post, 'post_id' | 'views_24h' | 'check_in_completed_at'> & { views_24h?: number | null; check_in_completed_at?: string | null }): Promise<Post> {
    const uid = this.currentUserId || auth?.currentUser?.uid || undefined;
    const viewsValue = post.views_24h !== undefined && post.views_24h !== null 
      ? Math.max(0, Math.round(post.views_24h)) 
      : null;
    const completedAt = viewsValue !== null 
      ? (post.check_in_completed_at || new Date().toISOString()) 
      : null;

    const newPost: Post = {
      ...post,
      post_id: 'post_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      user_id: uid,
      views_24h: viewsValue,
      check_in_completed_at: completedAt,
    };

    // Update local immediately for zero-lag UI
    this.posts.unshift(newPost);
    this.persistLocal();

    // Sync to Cloud Firestore if authenticated
    if (isFirebaseConfigured() && db && uid) {
      try {
        await setDoc(doc(db, 'posts', newPost.post_id), sanitizeForFirestore(newPost));
        console.log('[Firestore] Post synced successfully:', newPost.post_id);
      } catch (err) {
        console.error('[Firestore] Failed to save post to cloud:', err);
      }
    }

    return newPost;
  }

  /**
   * Records 24h performance outcome.
   * Updated in Cloud Firestore and mirrored locally.
   */
  public async record24hViews(postId: string, views: number): Promise<boolean> {
    const index = this.posts.findIndex(p => p.post_id === postId);
    if (index === -1) return false;

    const viewsValue = Math.max(0, Math.round(views));
    const completedAt = new Date().toISOString();

    this.posts[index] = {
      ...this.posts[index],
      views_24h: viewsValue,
      check_in_completed_at: completedAt,
    };
    this.persistLocal();

    // Sync to Cloud Firestore if authenticated
    const uid = this.currentUserId || auth?.currentUser?.uid;
    if (isFirebaseConfigured() && db && uid) {
      try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          views_24h: viewsValue,
          check_in_completed_at: completedAt,
        });
        console.log('[Firestore] 24h views locked in cloud for:', postId);
      } catch (err) {
        console.error('[Firestore] Failed to update views in cloud:', err);
      }
    }

    return true;
  }

  /**
   * Promotes a Trial reel to Public status.
   * IMPORTANT: posted_at is preserved (original trial time) for accurate matrix bucketing.
   * promoted_to_public_at = NOW drives the 24h public performance timer.
   * PIN verification must be done at the UI layer before calling this.
   */
  public async promoteTrialToPublic(postId: string): Promise<boolean> {
    const index = this.posts.findIndex(p => p.post_id === postId);
    if (index === -1) return false;

    const nowISO = new Date().toISOString();
    const existingTrialViews = this.posts[index].views_24h ?? this.posts[index].trial_views_24h ?? null;

    this.posts[index] = {
      ...this.posts[index],
      post_type: 'public',
      // posted_at stays unchanged — original trial posting time used for Day×Bucket matrix
      promoted_to_public_at: nowISO, // 24h public timer is gated on this
      trial_views_24h: existingTrialViews, // Preserves trial performance outcome
      views_24h: null,
      check_in_completed_at: null,
    };
    this.persistLocal();

    // Sync to Cloud Firestore if authenticated
    const uid = this.currentUserId || auth?.currentUser?.uid;
    if (isFirebaseConfigured() && db && uid) {
      try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          post_type: 'public',
          promoted_to_public_at: nowISO,
          trial_views_24h: existingTrialViews,
          views_24h: null,
          check_in_completed_at: null,
        });
        console.log('[Firestore] Trial promoted to public in cloud:', postId);
      } catch (err) {
        console.error('[Firestore] Failed to promote trial to public in cloud:', err);
      }
    }

    return true;
  }


  public simulate24hElapsed(postId: string): void {
    // Strictly dev-only helper to protect production timestamp immutability (Spec Section 3.1)
    if (!import.meta.env.DEV) {
      console.warn('[Security] simulate24hElapsed is strictly disabled in production builds to preserve timestamp immutability.');
      return;
    }

    const post = this.posts.find(p => p.post_id === postId);
    if (post) {
      const simulatedTime = new Date(Date.now() - 24.5 * 3600 * 1000).toISOString();
      // For promoted posts, fast-forward the promotion timestamp (not posted_at)
      if (post.promoted_to_public_at) {
        post.promoted_to_public_at = simulatedTime;
        this.persistLocal();
        if (isFirebaseConfigured() && db) {
          updateDoc(doc(db, 'posts', postId), { promoted_to_public_at: simulatedTime }).catch(() => {});
        }
      } else {
        post.posted_at = simulatedTime;
        this.persistLocal();
        if (isFirebaseConfigured() && db) {
          updateDoc(doc(db, 'posts', postId), { posted_at: simulatedTime }).catch(() => {});
        }
      }
    }
  }

  public async deletePost(postId: string): Promise<void> {
    // Locate post before removing to extract media reference
    const targetPost = this.posts.find(p => p.post_id === postId);
    const mediaRef = targetPost?.media_ref;

    // 1. Mark as permanently deleted in local tombstone
    this.deletedPostIds.add(postId);
    this.persistDeleted();

    // 2. Immediately remove from active memory & update local storage
    this.posts = this.posts.filter(p => p.post_id !== postId);
    this.persistLocal();

    // 3. Purge media thumbnail from Supabase Storage
    if (mediaRef) {
      await this.deleteMedia(mediaRef);
    }

    // 4. Purge from Cloud Firestore if connected
    const uid = this.currentUserId || auth?.currentUser?.uid;
    if (isFirebaseConfigured() && db && uid) {
      const firestoreDb = db;
      try {
        // Direct doc deletion by ID
        await deleteDoc(doc(firestoreDb, 'posts', postId));
        console.log('[Firestore] Post deleted from cloud by ID:', postId);
      } catch (err) {
        console.warn('[Firestore] Direct deleteDoc failed, trying query delete:', err);
      }

      // Query deletion in case document had an auto-generated Firestore doc ID
      try {
        const postsCol = collection(firestoreDb, 'posts');
        const q = query(postsCol, where('post_id', '==', postId));
        const snap = await getDocs(q);
        const batch: Promise<any>[] = [];
        snap.forEach(d => batch.push(deleteDoc(d.ref).catch(() => {})));
        await Promise.all(batch);
        console.log('[Firestore] Query deleteDoc purged docs for post:', postId);
      } catch (err) {
        console.warn('[Firestore] Query deleteDoc failed:', err);
      }
    }
  }

  /**
   * Clears all local data AND deletes matching records from Cloud Firestore
   * so records do not resurrect on the next realtime snapshot.
   */
  public async clearAllData(): Promise<void> {
    const postIdsToDelete = this.posts.map(p => p.post_id);
    const signalIdsToDelete = this.signals.map(s => s.signal_id);
    const mediaRefsToDelete = this.posts.map(p => p.media_ref).filter(Boolean) as string[];

    postIdsToDelete.forEach(id => this.deletedPostIds.add(id));
    signalIdsToDelete.forEach(id => this.deletedSignalIds.add(id));
    this.persistDeleted();

    this.posts = [];
    this.signals = [];
    this.persistLocal();

    // Purge media from Supabase storage
    for (const ref of mediaRefsToDelete) {
      await this.deleteMedia(ref);
    }

    const uid = this.currentUserId || auth?.currentUser?.uid;
    if (isFirebaseConfigured() && db && uid) {
      const firestoreDb = db;
      try {
        const batchDeletes: Promise<any>[] = [];
        postIdsToDelete.forEach(id => {
          batchDeletes.push(deleteDoc(doc(firestoreDb, 'posts', id)).catch(() => {}));
        });
        signalIdsToDelete.forEach(id => {
          batchDeletes.push(deleteDoc(doc(firestoreDb, 'external_signals', id)).catch(() => {}));
        });
        await Promise.all(batchDeletes);
        console.log('[Firestore] All data purged from Cloud Firestore.');
      } catch (err) {
        console.error('[Firestore] Failed to purge cloud collections:', err);
      }
    }
  }

  /**
   * Unsubscribes active Firestore and Auth listeners to prevent memory leaks during lifecycle teardowns.
   */
  public destroy(): void {
    this.detachFirestoreListeners();
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
  }

  // --- External Signals Methods ---

  public getSignals(): ExternalSignal[] {
    return this.signals
      .filter(s => !this.deletedSignalIds.has(s.signal_id))
      .sort((a, b) => new Date(b.week_of).getTime() - new Date(a.week_of).getTime());
  }

  public async addSignal(signal: Omit<ExternalSignal, 'signal_id' | 'created_at'>): Promise<ExternalSignal> {
    const uid = this.currentUserId || auth?.currentUser?.uid || undefined;
    const newSignal: ExternalSignal = {
      ...signal,
      signal_id: 'sig_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      user_id: uid,
      created_at: new Date().toISOString(),
    };

    this.signals.unshift(newSignal);
    this.persistLocal();

    if (isFirebaseConfigured() && db && uid) {
      try {
        await setDoc(doc(db, 'external_signals', newSignal.signal_id), sanitizeForFirestore(newSignal));
        console.log('[Firestore] External signal saved to cloud:', newSignal.signal_id);
      } catch (err) {
        console.error('[Firestore] Failed to save signal to cloud:', err);
      }
    }

    return newSignal;
  }

  public async deleteSignal(signalId: string): Promise<void> {
    this.deletedSignalIds.add(signalId);
    this.persistDeleted();

    this.signals = this.signals.filter(s => s.signal_id !== signalId);
    this.persistLocal();

    const uid = this.currentUserId || auth?.currentUser?.uid;
    if (isFirebaseConfigured() && db && uid) {
      const firestoreDb = db;
      try {
        await deleteDoc(doc(firestoreDb, 'external_signals', signalId));
      } catch (err) {
        console.warn('[Firestore] Direct deleteDoc signal failed:', err);
      }

      try {
        const col = collection(firestoreDb, 'external_signals');
        const q = query(col, where('signal_id', '==', signalId));
        const snap = await getDocs(q);
        const batch: Promise<any>[] = [];
        snap.forEach(d => batch.push(deleteDoc(d.ref).catch(() => {})));
        await Promise.all(batch);
      } catch (err) {
        console.warn('[Firestore] Query deleteDoc signal failed:', err);
      }
    }
  }

  // --- Media Upload (Supabase Adapter) ---

  public async uploadMedia(file: File): Promise<string> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `thumbnails/${fileName}`;

        const { error } = await supabase.storage
          .from(supabaseConfig.bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('[Supabase Upload Error]:', error);
          throw error;
        }

        const { data: publicData } = supabase.storage
          .from(supabaseConfig.bucketName)
          .getPublicUrl(filePath);

        console.log('[Supabase Upload Success]:', publicData.publicUrl);
        return publicData.publicUrl;
      } catch (err) {
        console.warn('Falling back to local data URL due to upload error:', err);
      }
    }

    // Local fallback: create Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Deletes a thumbnail or media file from Supabase Storage bucket.
   */
  public async deleteMedia(mediaRef?: string): Promise<boolean> {
    if (!mediaRef || !isSupabaseConfigured() || !supabase) return false;
    // Skip base64 data URLs or blob URLs
    if (mediaRef.startsWith('data:') || mediaRef.startsWith('blob:')) return false;

    try {
      const bucket = supabaseConfig.bucketName;
      let path = '';

      const marker = `/${bucket}/`;
      const idx = mediaRef.indexOf(marker);
      if (idx !== -1) {
        path = decodeURIComponent(mediaRef.substring(idx + marker.length));
      } else if (mediaRef.includes('thumbnails/')) {
        const tIdx = mediaRef.indexOf('thumbnails/');
        path = decodeURIComponent(mediaRef.substring(tIdx));
      } else {
        const parts = mediaRef.split('/');
        path = `thumbnails/${parts[parts.length - 1]}`;
      }

      if (!path) return false;

      // Pass both full path and variant without/with 'thumbnails/' prefix to ensure match
      const pathsToDelete = [path];
      if (path.startsWith('thumbnails/')) {
        pathsToDelete.push(path.replace('thumbnails/', ''));
      } else {
        pathsToDelete.push(`thumbnails/${path}`);
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .remove(pathsToDelete);

      if (error) {
        console.error('[Supabase Media Deletion Error]:', error);
        return false;
      }

      console.log('[Supabase Media Deleted Successfully]:', data);
      return true;
    } catch (err) {
      console.error('[Supabase Delete Exception]:', err);
      return false;
    }
  }

  /**
   * Scans Supabase Storage bucket for orphaned thumbnails that no longer correspond to active posts
   * and purges them.
   */
  public async purgeOrphanedThumbnails(): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) return 0;

    try {
      const bucket = supabaseConfig.bucketName;
      const { data: files, error } = await supabase.storage.from(bucket).list('thumbnails');
      if (error || !files) {
        console.warn('[Supabase] Failed to list thumbnails for orphan cleanup:', error);
        return 0;
      }

      // Collect all active mediaRefs
      const activeUrls = new Set(this.posts.map(p => p.media_ref).filter(Boolean) as string[]);
      const toDelete: string[] = [];

      for (const file of files) {
        // If file is not referenced by any active post
        const isReferenced = Array.from(activeUrls).some(url => url.includes(file.name));
        if (!isReferenced) {
          toDelete.push(`thumbnails/${file.name}`);
        }
      }

      if (toDelete.length > 0) {
        console.log(`[Supabase] Purging ${toDelete.length} orphaned thumbnails:`, toDelete);
        await supabase.storage.from(bucket).remove(toDelete);
      }

      return toDelete.length;
    } catch (err) {
      console.error('[Supabase] Orphan cleanup error:', err);
      return 0;
    }
  }
}

export const storageService = new StorageService();
