export type PostType = 'trial' | 'public';

export type SlotSource = 'algorithm' | 'user';

export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night';

export interface Post {
  post_id: string;
  user_id?: string; // Authenticated creator UID
  title?: string;
  post_type: PostType;
  posted_at: string; // ISO 8601 UTC — original trial/public posting time (immutable for matrix bucketing)
  caption?: string;
  media_ref?: string; // Supabase URL or local preview URL
  slot_source: SlotSource;
  views_24h: number | null; // Nullable until 24h check-in is recorded
  check_in_completed_at?: string | null;
  external_signal_id?: string | null;
  notes?: string;
  promoted_to_public_at?: string | null; // Set when trial→public; drives 24h public timer (posted_at stays original)
  trial_views_24h?: number | null; // Preserves trial 24h performance outcome after promotion to public
}

export interface ExternalSignal {
  signal_id: string;
  user_id?: string; // Authenticated creator UID
  week_of: string; // YYYY-MM-DD representing the Monday/start of the week
  note_text: string; // Free-form: algorithm news, shadow-ban reports, trending audio
  source_url?: string;
  created_at: string; // ISO 8601 UTC timestamp
}

export type EngineStage = 'stage_1_descriptive' | 'stage_2_weighted' | 'stage_3_bandit';

export interface TimeSlotRecommendation {
  day_of_week: string; // Monday, Tuesday, etc.
  day_index: number; // 0 = Sunday, 1 = Monday, etc.
  time_bucket: TimeBucket;
  suggested_time_ist: string; // e.g. "07:30 PM IST"
  stage: EngineStage;
  confidence_score: number; // 0 - 100%
  sample_size: number;
  expected_median_views: number;
  expected_mean_views: number;
  is_exploration: boolean; // Stage 3 Bandit exploration indicator
  rationale: string;
}

export interface BucketStats {
  bucket: TimeBucket;
  label: string;
  timeRange: string;
  postCount: number;
  completedCount: number;
  meanViews: number;
  medianViews: number;
  recencyWeightedScore: number;
  outlierCount?: number;
  posts: Post[];
}

export interface DayStats {
  dayName: string;
  dayIndex: number;
  buckets: Record<TimeBucket, BucketStats>;
  totalCompletedPosts: number;
  overallMedianViews: number;
}

export interface ComparisonReport {
  algorithm: {
    totalPosts: number;
    completedPosts: number;
    meanViews: number;
    medianViews: number;
    topPostViews: number;
  };
  user: {
    totalPosts: number;
    completedPosts: number;
    meanViews: number;
    medianViews: number;
    topPostViews: number;
  };
  edgePercentage: number; // Positive if algorithm outperforms user choice
}

export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

export type RelationshipStatus = 'single' | 'in-a-relationship' | 'engaged' | 'married' | 'prefer-not-to-say';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  age: number;
  gender: Gender;
  relationship: RelationshipStatus;
  onboarding_completed: boolean;
  deletion_pin?: string;
  created_at: string;
  updated_at: string;
}
