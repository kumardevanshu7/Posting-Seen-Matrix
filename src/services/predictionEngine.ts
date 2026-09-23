import { Post, TimeBucket, TimeSlotRecommendation, EngineStage, ComparisonReport, DayStats, BucketStats } from '../types';
import { getISTDayOfWeek, getTimeBucket, DAYS_OF_WEEK, TIME_BUCKET_CONFIG } from '../utils/dateUtils';

const BUCKET_KEYS: TimeBucket[] = ['morning', 'afternoon', 'evening', 'night'];

/**
 * Calculates median of an array of numbers.
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

/**
 * Calculates mean of an array of numbers.
 */
export function calculateMean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / numbers.length);
}

/**
 * Detects viral outliers (> 3x median, min 5000 views)
 */
export function isOutlier(views: number, median: number): boolean {
  return views > Math.max(median * 3, 5000);
}

/**
 * Formats a 24-hour integer into a 12-hour IST string, handling midnight (0 -> 12 AM) correctly.
 */
export function formatHourSlotIST(hour: number, minutes = '00'): string {
  const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
  const period = hour >= 12 ? 'PM' : 'AM';
  const padHour = displayHour < 10 ? '0' + displayHour : displayHour;
  return `${padHour}:${minutes} ${period} IST`;
}

/**
 * Recency weight factor:
 * Gives exponentially decaying weights to older posts.
 * Half-life of 21 days (3 weeks) so Instagram algorithm shifts are honored.
 */
export function getRecencyWeight(postedAtUTC: string, nowUTC: number = Date.now()): number {
  const postTime = new Date(postedAtUTC).getTime();
  const diffDays = Math.max(0, (nowUTC - postTime) / (1000 * 60 * 60 * 24));
  const halfLifeDays = 21;
  return Math.pow(0.5, diffDays / halfLifeDays);
}

/**
 * Determines current engine stage based on sample size of completed posts.
 */
export function getEngineStage(completedPostCount: number): EngineStage {
  if (completedPostCount < 15) return 'stage_1_descriptive';
  if (completedPostCount < 50) return 'stage_2_weighted';
  return 'stage_3_bandit';
}

/**
 * Computes day-by-day and bucket-by-bucket statistics for a given set of posts.
 */
export function computeMatrixStats(posts: Post[]): DayStats[] {
  // Only completed check-ins count toward performance matrix
  const completedPosts = posts.filter(p => p.views_24h !== null && p.views_24h !== undefined);

  return DAYS_OF_WEEK.map((dayName, dayIndex) => {
    const dayPosts = completedPosts.filter(p => getISTDayOfWeek(p.posted_at) === dayIndex);
    const dayViews = dayPosts.map(p => p.views_24h as number);
    const overallMedian = calculateMedian(dayViews);

    const bucketsRecord = {} as Record<TimeBucket, BucketStats>;

    BUCKET_KEYS.forEach(bucket => {
      const bucketPosts = dayPosts.filter(p => getTimeBucket(p.posted_at) === bucket);
      const viewsList = bucketPosts.map(p => p.views_24h as number);
      const median = calculateMedian(viewsList);

      // Robust Recency-weighted score with Outlier Capping (spec Section 6.3)
      let weightedSum = 0;
      let totalWeights = 0;
      let outlierCount = 0;

      bucketPosts.forEach(p => {
        const views = p.views_24h as number;
        const outlier = isOutlier(views, median);
        if (outlier) outlierCount++;

        // Cap outliers at 3x median (min 5,000) so viral spikes keep signal without distorting Stage 2/3
        const effectiveViews = outlier ? Math.max(median * 3, 5000) : views;
        const weight = getRecencyWeight(p.posted_at);
        weightedSum += effectiveViews * weight;
        totalWeights += weight;
      });
      const recencyScore = totalWeights > 0 ? Math.round(weightedSum / totalWeights) : 0;

      bucketsRecord[bucket] = {
        bucket,
        label: TIME_BUCKET_CONFIG[bucket].label,
        timeRange: TIME_BUCKET_CONFIG[bucket].range,
        postCount: posts.filter(p => getISTDayOfWeek(p.posted_at) === dayIndex && getTimeBucket(p.posted_at) === bucket).length,
        completedCount: bucketPosts.length,
        meanViews: calculateMean(viewsList),
        medianViews: median,
        recencyWeightedScore: recencyScore,
        outlierCount,
        posts: bucketPosts,
      };
    });

    return {
      dayName,
      dayIndex,
      buckets: bucketsRecord,
      totalCompletedPosts: dayPosts.length,
      overallMedianViews: overallMedian,
    };
  });
}

/**
 * Generates the optimal posting slot recommendation based on the current engine stage.
 */
export function generateRecommendation(posts: Post[]): TimeSlotRecommendation {
  const completedPosts = posts.filter(p => p.views_24h !== null && p.views_24h !== undefined);
  const totalCompleted = completedPosts.length;
  const stage = getEngineStage(totalCompleted);
  const matrixStats = computeMatrixStats(posts);

  // If literally zero posts
  if (totalCompleted === 0) {
    return {
      day_of_week: 'Tuesday',
      day_index: 2,
      time_bucket: 'evening',
      suggested_time_ist: '07:30 PM IST',
      stage: 'stage_1_descriptive',
      confidence_score: 5,
      sample_size: 0,
      expected_median_views: 0,
      expected_mean_views: 0,
      is_exploration: false,
      rationale: 'No logged posts yet. Industry baseline recommends Tuesday Evening (7:30 PM IST) for your initial reel test.',
    };
  }

  // Flatten all 7x4 buckets
  interface SlotCandidate {
    dayName: string;
    dayIndex: number;
    bucket: TimeBucket;
    stats: BucketStats;
    totalDayCompleted: number;
  }

  const allSlots: SlotCandidate[] = [];
  matrixStats.forEach(d => {
    BUCKET_KEYS.forEach(b => {
      allSlots.push({
        dayName: d.dayName,
        dayIndex: d.dayIndex,
        bucket: b,
        stats: d.buckets[b],
        totalDayCompleted: d.totalCompletedPosts,
      });
    });
  });

  // STAGE 1: Pure Descriptive Stats (0-14 data points)
  if (stage === 'stage_1_descriptive') {
    // Find the single best post or slot with highest median/views
    const slotsWithData = allSlots.filter(s => s.stats.completedCount > 0);

    if (slotsWithData.length === 0) {
      // Posts logged, but none completed 24h yet
      return {
        day_of_week: 'Wednesday',
        day_index: 3,
        time_bucket: 'evening',
        suggested_time_ist: '07:30 PM IST',
        stage: 'stage_1_descriptive',
        confidence_score: 10,
        sample_size: 0,
        expected_median_views: 0,
        expected_mean_views: 0,
        is_exploration: false,
        rationale: 'Posts are logged and awaiting 24h check-in. Once you record view counts, real-time stats will activate.',
      };
    }

    // Rank by median views first (guard against outliers), then count
    slotsWithData.sort((a, b) => {
      if (b.stats.medianViews !== a.stats.medianViews) {
        return b.stats.medianViews - a.stats.medianViews;
      }
      return b.stats.completedCount - a.stats.completedCount;
    });

    const topSlot = slotsWithData[0];
    const hour = TIME_BUCKET_CONFIG[topSlot.bucket].defaultSuggestedHour;
    const timeIst = formatHourSlotIST(hour, '00');

    // Confidence: capped at 25% during cold start to be honest
    const confidence = Math.min(25, Math.round((totalCompleted / 15) * 25));

    return {
      day_of_week: topSlot.dayName,
      day_index: topSlot.dayIndex,
      time_bucket: topSlot.bucket,
      suggested_time_ist: timeIst,
      stage: 'stage_1_descriptive',
      confidence_score: Math.max(15, confidence),
      sample_size: topSlot.stats.completedCount,
      expected_median_views: topSlot.stats.medianViews,
      expected_mean_views: topSlot.stats.meanViews,
      is_exploration: false,
      rationale: `Cold start mode (${totalCompleted}/15 data points). Descriptive stats only. Best slot so far is ${topSlot.dayName} ${topSlot.stats.label} with median ${topSlot.stats.medianViews.toLocaleString()} views.`,
    };
  }

  // STAGE 2: Recency-Weighted Scoring (15-49 data points)
  if (stage === 'stage_2_weighted') {
    const slotsWithData = allSlots.filter(s => s.stats.completedCount > 0);

    // Score combines recency-weighted score and sample-density penalty
    slotsWithData.sort((a, b) => {
      // Require at least 1-2 posts before being chosen over others
      const scoreA = a.stats.recencyWeightedScore * Math.min(1.2, 0.7 + a.stats.completedCount * 0.1);
      const scoreB = b.stats.recencyWeightedScore * Math.min(1.2, 0.7 + b.stats.completedCount * 0.1);
      return scoreB - scoreA;
    });

    const topSlot = slotsWithData[0];
    const hour = TIME_BUCKET_CONFIG[topSlot.bucket].defaultSuggestedHour;
    const timeIst = formatHourSlotIST(hour, '30');

    // Confidence between 30% and 75%
    const baseConfidence = 30 + Math.round(((totalCompleted - 15) / 35) * 45);
    const bucketConfidenceBoost = Math.min(15, topSlot.stats.completedCount * 3);
    const confidence = Math.min(80, baseConfidence + bucketConfidenceBoost);

    return {
      day_of_week: topSlot.dayName,
      day_index: topSlot.dayIndex,
      time_bucket: topSlot.bucket,
      suggested_time_ist: timeIst,
      stage: 'stage_2_weighted',
      confidence_score: confidence,
      sample_size: topSlot.stats.completedCount,
      expected_median_views: topSlot.stats.medianViews,
      expected_mean_views: topSlot.stats.meanViews,
      is_exploration: false,
      rationale: `Pattern emerging from ${totalCompleted} posts. Recency-weighted analysis shows ${topSlot.dayName} ${topSlot.stats.label} consistently yielding high engagement (~${topSlot.stats.medianViews.toLocaleString()} median views).`,
    };
  }

  // STAGE 3: Contextual Multi-Armed Bandit (50+ data points)
  // Balances Exploitation (highest reward) with Exploration (UCB1 formula)
  const maxViewsOverall = Math.max(...completedPosts.map(p => p.views_24h as number), 1);
  const totalN = totalCompleted;

  let bestUcbScore = -1;
  let selectedSlot = allSlots[0];
  let isExplore = false;

  // Global exploration factor c
  const c = 1.414; // sqrt(2)

  allSlots.forEach(slot => {
    const nj = slot.stats.completedCount;
    let ucbValue = 0;

    if (nj === 0) {
      // High bonus for completely unvisited slot (pure exploration opportunity)
      ucbValue = 1.0 + c * Math.sqrt(Math.log(totalN + 1) / 1);
    } else {
      // Normalized recency reward in [0, 1]
      const normalizedReward = slot.stats.recencyWeightedScore / maxViewsOverall;
      // Exploration bonus
      const explorationBonus = c * Math.sqrt(Math.log(totalN) / nj);
      ucbValue = normalizedReward + explorationBonus;
    }

    if (ucbValue > bestUcbScore) {
      bestUcbScore = ucbValue;
      selectedSlot = slot;
    }
  });

  // Check if this slot was selected primarily for exploration
  const topExploitSlot = [...allSlots]
    .filter(s => s.stats.completedCount > 0)
    .sort((a, b) => b.stats.recencyWeightedScore - a.stats.recencyWeightedScore)[0];

  // If top exploitation slot exists and another slot was chosen, it was chosen due to UCB1 exploration bonus
  if (topExploitSlot && selectedSlot !== topExploitSlot) {
    isExplore = true;
  }

  const hour = TIME_BUCKET_CONFIG[selectedSlot.bucket].defaultSuggestedHour;
  const timeIst = formatHourSlotIST(hour, '00');
  const confidence = isExplore ? 65 : Math.min(95, 80 + Math.min(15, Math.floor((totalCompleted - 50) / 10)));

  const rationale = isExplore
    ? `Bandit Exploration: The algorithm recommends testing ${selectedSlot.dayName} ${selectedSlot.stats.label} to map potential audience activity while keeping our top slots sharp.`
    : `Bandit Exploitation: ${selectedSlot.dayName} ${selectedSlot.stats.label} is your top proven performer (${selectedSlot.stats.completedCount} posts, ${selectedSlot.stats.medianViews.toLocaleString()} median views).`;

  return {
    day_of_week: selectedSlot.dayName,
    day_index: selectedSlot.dayIndex,
    time_bucket: selectedSlot.bucket,
    suggested_time_ist: timeIst,
    stage: 'stage_3_bandit',
    confidence_score: confidence,
    sample_size: selectedSlot.stats.completedCount,
    expected_median_views: selectedSlot.stats.medianViews,
    expected_mean_views: selectedSlot.stats.meanViews,
    is_exploration: isExplore,
    rationale,
  };
}

/**
 * Computes side-by-side performance of Algorithm-Suggested slots vs User-Chosen slots (Section 3.5).
 */
export function computeComparisonReport(posts: Post[]): ComparisonReport {
  const algoPosts = posts.filter(p => p.slot_source === 'algorithm');
  const userPosts = posts.filter(p => p.slot_source === 'user');

  const algoCompleted = algoPosts.filter(p => p.views_24h !== null && p.views_24h !== undefined);
  const userCompleted = userPosts.filter(p => p.views_24h !== null && p.views_24h !== undefined);

  const algoViews = algoCompleted.map(p => p.views_24h as number);
  const userViews = userCompleted.map(p => p.views_24h as number);

  const algoMean = calculateMean(algoViews);
  const userMean = calculateMean(userViews);
  const algoMedian = calculateMedian(algoViews);
  const userMedian = calculateMedian(userViews);

  const algoTop = algoViews.length > 0 ? Math.max(...algoViews) : 0;
  const userTop = userViews.length > 0 ? Math.max(...userViews) : 0;

  // Percentage advantage of algorithm over user
  let edge = 0;
  if (userMedian > 0 && algoMedian > 0) {
    edge = Math.round(((algoMedian - userMedian) / userMedian) * 100);
  } else if (userMean > 0 && algoMean > 0) {
    edge = Math.round(((algoMean - userMean) / userMean) * 100);
  }

  return {
    algorithm: {
      totalPosts: algoPosts.length,
      completedPosts: algoCompleted.length,
      meanViews: algoMean,
      medianViews: algoMedian,
      topPostViews: algoTop,
    },
    user: {
      totalPosts: userPosts.length,
      completedPosts: userCompleted.length,
      meanViews: userMean,
      medianViews: userMedian,
      topPostViews: userTop,
    },
    edgePercentage: edge,
  };
}
