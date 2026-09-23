import { Post, PostType, ExternalSignal } from '../types';
import { db, isFirebaseConfigured } from '../config/firebase';
import { supabase, supabaseConfig, isSupabaseConfigured } from '../config/supabase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';

const STORAGE_KEY_POSTS = 'time_matrix_posts_v3';
const STORAGE_KEY_SIGNALS = 'time_matrix_signals_v3';

class StorageService {
  private posts: Post[] = [];
  private signals: ExternalSignal[] = [];
  private listeners: Array<() => void> = [];
  private unsubscribeFirestorePosts: (() => void) | null = null;
  private unsubscribeFirestoreSignals: (() => void) | null = null;

  constructor() {
    this.loadFromLocal();
    if (isFirebaseConfigured() && db) {
      this.initFirestoreSync();
    }
  }

  private loadFromLocal() {
    try {
      const storedPosts = localStorage.getItem(STORAGE_KEY_POSTS);
      const storedSignals = localStorage.getItem(STORAGE_KEY_SIGNALS);
      this.posts = storedPosts ? JSON.parse(storedPosts) : [];
      this.signals = storedSignals ? JSON.parse(storedSignals) : [];
    } catch (e) {
      console.error('Failed to load local storage:', e);
      this.posts = [];
      this.signals = [];
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

  private initFirestoreSync() {
    if (!db) return;
    const firestoreDb = db;

    try {
      // 1. Realtime listener for posts with non-destructive merge & backfill
      const postsCol = collection(firestoreDb, 'posts');
      const postsQuery = query(postsCol, orderBy('posted_at', 'desc'));

      this.unsubscribeFirestorePosts = onSnapshot(postsQuery, async (snapshot) => {
        const remotePosts: Post[] = [];
        snapshot.forEach((d) => {
          remotePosts.push(d.data() as Post);
        });

        // Merge logic: index remote posts by post_id
        const remoteMap = new Map<string, Post>(remotePosts.map(p => [p.post_id, p]));

        // Check if there are local posts that don't exist in Firestore (e.g. created offline or before connection)
        const unSyncedLocalPosts = this.posts.filter(localPost => !remoteMap.has(localPost.post_id));

        // Backfill local posts to Cloud Firestore so they are never silently erased
        if (unSyncedLocalPosts.length > 0 && isFirebaseConfigured()) {
          console.log(`[Firestore] Preserving & backfilling ${unSyncedLocalPosts.length} local posts to Cloud Firestore...`);
          for (const localPost of unSyncedLocalPosts) {
            try {
              await setDoc(doc(firestoreDb, 'posts', localPost.post_id), localPost);
              remoteMap.set(localPost.post_id, localPost);
            } catch (syncErr) {
              console.warn('[Firestore] Failed to backfill local post:', localPost.post_id, syncErr);
            }
          }
        }

        // Combined post list sorted descending by IST posted_at
        this.posts = Array.from(remoteMap.values()).sort(
          (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
        );
        this.persistLocal();
      }, (error) => {
        console.warn('[Firestore] Posts listener fallback to local:', error);
      });

      // 2. Realtime listener for external signals with non-destructive merge & backfill
      const signalsCol = collection(firestoreDb, 'external_signals');
      const signalsQuery = query(signalsCol, orderBy('week_of', 'desc'));

      this.unsubscribeFirestoreSignals = onSnapshot(signalsQuery, async (snapshot) => {
        const remoteSignals: ExternalSignal[] = [];
        snapshot.forEach((d) => {
          remoteSignals.push(d.data() as ExternalSignal);
        });

        const remoteMap = new Map<string, ExternalSignal>(remoteSignals.map(s => [s.signal_id, s]));
        const unSyncedLocalSignals = this.signals.filter(localSig => !remoteMap.has(localSig.signal_id));

        if (unSyncedLocalSignals.length > 0 && isFirebaseConfigured()) {
          console.log(`[Firestore] Preserving & backfilling ${unSyncedLocalSignals.length} local signals to Cloud Firestore...`);
          for (const localSig of unSyncedLocalSignals) {
            try {
              await setDoc(doc(firestoreDb, 'external_signals', localSig.signal_id), localSig);
              remoteMap.set(localSig.signal_id, localSig);
            } catch (syncErr) {
              console.warn('[Firestore] Failed to backfill local signal:', localSig.signal_id, syncErr);
            }
          }
        }

        this.signals = Array.from(remoteMap.values()).sort(
          (a, b) => new Date(b.week_of).getTime() - new Date(a.week_of).getTime()
        );
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
    if (postType) {
      return this.posts
        .filter(p => p.post_type === postType)
        .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
    }
    return [...this.posts].sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
  }

  public getPostById(postId: string): Post | undefined {
    return this.posts.find(p => p.post_id === postId);
  }

  /**
   * Logs a new post.
   * Stored in Cloud Firestore and mirrored locally.
   */
  public async addPost(post: Omit<Post, 'post_id' | 'views_24h' | 'check_in_completed_at'>): Promise<Post> {
    const newPost: Post = {
      ...post,
      post_id: 'post_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      views_24h: null,
      check_in_completed_at: null,
    };

    // Update local immediately for zero-lag UI
    this.posts.unshift(newPost);
    this.persistLocal();

    // Sync to Cloud Firestore
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'posts', newPost.post_id), newPost);
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

    // Sync to Cloud Firestore
    if (isFirebaseConfigured() && db) {
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

  public simulate24hElapsed(postId: string): void {
    // Strictly dev-only helper to protect production timestamp immutability (Spec Section 3.1)
    if (!import.meta.env.DEV) {
      console.warn('[Security] simulate24hElapsed is strictly disabled in production builds to preserve timestamp immutability.');
      return;
    }

    const post = this.posts.find(p => p.post_id === postId);
    if (post) {
      const simulatedTime = new Date(Date.now() - 24.5 * 3600 * 1000).toISOString();
      post.posted_at = simulatedTime;
      this.persistLocal();

      if (isFirebaseConfigured() && db) {
        updateDoc(doc(db, 'posts', postId), { posted_at: simulatedTime }).catch(() => {});
      }
    }
  }

  public async deletePost(postId: string): Promise<void> {
    this.posts = this.posts.filter(p => p.post_id !== postId);
    this.persistLocal();

    if (isFirebaseConfigured() && db) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
        console.log('[Firestore] Post deleted from cloud:', postId);
      } catch (err) {
        console.error('[Firestore] Failed to delete post from cloud:', err);
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

    this.posts = [];
    this.signals = [];
    this.persistLocal();

    if (isFirebaseConfigured() && db) {
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
   * Unsubscribes active Firestore listeners to prevent memory leaks during lifecycle teardowns.
   */
  public destroy(): void {
    if (this.unsubscribeFirestorePosts) {
      this.unsubscribeFirestorePosts();
      this.unsubscribeFirestorePosts = null;
    }
    if (this.unsubscribeFirestoreSignals) {
      this.unsubscribeFirestoreSignals();
      this.unsubscribeFirestoreSignals = null;
    }
  }

  // --- External Signals Methods ---

  public getSignals(): ExternalSignal[] {
    return [...this.signals].sort((a, b) => new Date(b.week_of).getTime() - new Date(a.week_of).getTime());
  }

  public async addSignal(signal: Omit<ExternalSignal, 'signal_id' | 'created_at'>): Promise<ExternalSignal> {
    const newSignal: ExternalSignal = {
      ...signal,
      signal_id: 'sig_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      created_at: new Date().toISOString(),
    };

    this.signals.unshift(newSignal);
    this.persistLocal();

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'external_signals', newSignal.signal_id), newSignal);
        console.log('[Firestore] External signal saved to cloud:', newSignal.signal_id);
      } catch (err) {
        console.error('[Firestore] Failed to save signal to cloud:', err);
      }
    }

    return newSignal;
  }

  public async deleteSignal(signalId: string): Promise<void> {
    this.signals = this.signals.filter(s => s.signal_id !== signalId);
    this.persistLocal();

    if (isFirebaseConfigured() && db) {
      try {
        await deleteDoc(doc(db, 'external_signals', signalId));
      } catch (err) {
        console.error('[Firestore] Failed to delete signal from cloud:', err);
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
}

export const storageService = new StorageService();
