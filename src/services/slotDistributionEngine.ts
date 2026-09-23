import { Post, PostType, TimeBucket, DayStats } from '../types';
import { 
  getISTParts, 
  createUTCFromIST, 
  formatTimeIST, 
  getTimeBucket 
} from '../utils/dateUtils';
import { computeMatrixStats } from './predictionEngine';

export interface SmartSlot {
  slot_id: string;
  timestampUTC: string;
  timeIST: string;
  dateLabel: 'Today' | 'Tomorrow';
  bucket: TimeBucket;
  qualityTier: 'peak' | 'prime' | 'good' | 'fallback';
  qualityScore: number; // 0 - 100
  rationale: string;
  windowContext: string;
}

export interface SmartSlotPlan {
  postType: PostType;
  requestedCount: number;
  todayCount: number;
  tomorrowCount: number;
  hasSpillover: boolean;
  spilloverMessage?: string;
  executiveSummary: string;
  currentAnchorIST: string;
  slots: SmartSlot[];
}

/**
 * Hourly research engagement score (00:00 to 23:00 IST).
 * Reflects Indian mobile browsing habits and Instagram short-form video retention.
 */
const HOURLY_ENGAGEMENT_MAP: Record<number, { score: number; context: string; defaultRationale: string }> = {
  0:  { score: 38, context: 'Midnight Transition', defaultRationale: 'Late-night winding down • Lower immediate velocity' },
  1:  { score: 10, context: 'Dead Zone', defaultRationale: 'Algorithm penalty zone • Minimal active impressions' },
  2:  { score: 10, context: 'Dead Zone', defaultRationale: 'Dead zone • Deep sleep inactivity' },
  3:  { score: 10, context: 'Dead Zone', defaultRationale: 'Dead zone • Lowest impression floor' },
  4:  { score: 15, context: 'Pre-Dawn', defaultRationale: 'Pre-dawn • Minimal active reach' },
  5:  { score: 30, context: 'Early Morning', defaultRationale: 'Early risers • Casual initial check-in' },
  6:  { score: 50, context: 'Wake-Up Window', defaultRationale: 'Morning wake-up • Initial mobile scroll' },
  7:  { score: 62, context: 'Morning Routine', defaultRationale: 'Breakfast & prep • Light browsing velocity' },
  8:  { score: 72, context: 'Morning Commute', defaultRationale: 'Transit & college start • Short-form appetite' },
  9:  { score: 82, context: 'Morning Work Break', defaultRationale: 'Work/study pause • High initial hook discovery' },
  10: { score: 78, context: 'Mid-Morning Focus', defaultRationale: 'Mid-morning break • Steady reel browsing' },
  11: { score: 76, context: 'Pre-Lunch Buildup', defaultRationale: 'Pre-lunch transition • Audience activity rising' },
  12: { score: 88, context: 'Lunch Start', defaultRationale: 'Lunch hour • Rapid mobile usage spike across demographics' },
  13: { score: 92, context: 'Mid-Lunch Peak', defaultRationale: 'Mid-lunch peak • Maximum daytime retention and shares' },
  14: { score: 82, context: 'Post-Lunch Rest', defaultRationale: 'Post-lunch relaxation • Stable watch completion' },
  15: { score: 74, context: 'Afternoon Slump', defaultRationale: 'Afternoon pause • Moderate swipe volume' },
  16: { score: 78, context: 'Pre-Evening Pickup', defaultRationale: 'Pre-evening work transition • Browsing pickups' },
  17: { score: 90, context: 'Evening Tea Break', defaultRationale: 'Evening tea & commute • High hook test velocity' },
  18: { score: 88, context: 'Early Prime Transit', defaultRationale: 'Transit home • Strong feed consumption' },
  19: { score: 95, context: 'Prime Dinner Window', defaultRationale: 'Prime evening surge • High retention & viral velocity' },
  20: { score: 98, context: 'Peak Prime Time', defaultRationale: 'Peak prime hour • Maximum daily watch time & shares' },
  21: { score: 92, context: 'Post-Dinner Leisure', defaultRationale: 'Post-dinner relaxation • High video completion rate' },
  22: { score: 86, context: 'Night Bedtime Scroll', defaultRationale: 'Bedtime leisure scroll • Thoughtful and narrative hooks' },
  23: { score: 78, context: 'Late Night Wind-Down', defaultRationale: 'Late evening leisure • Excellent for high-curiosity reels' },
};

/**
 * Returns customized hourly scores blending research baselines with the creator's historical stats.
 * Uses precomputed DayStats and applies sample-size gating + Bayesian shrinkage to prevent noise skew.
 */
function getPersonalizedHourlyScores(
  dayStat: DayStats | undefined, 
  dayIndex: number
): Record<number, number> {
  const scores: Record<number, number> = {};

  for (let h = 0; h < 24; h++) {
    scores[h] = HOURLY_ENGAGEMENT_MAP[h].score;
  }

  // Mid-week prime boosts (Tuesday, Wednesday, Thursday)
  if (dayIndex === 2 || dayIndex === 3 || dayIndex === 4) {
    for (let h = 17; h <= 22; h++) scores[h] = Math.min(100, scores[h] + 4);
  } else if (dayIndex === 0) {
    // Sunday night engagement surge
    for (let h = 19; h <= 23; h++) scores[h] = Math.min(100, scores[h] + 5);
  }

  // Creator empirical overlay with sample-size gating and Bayesian shrinkage
  if (dayStat && dayStat.totalCompletedPosts >= 3 && dayStat.overallMedianViews > 0) {
    const overallMed = dayStat.overallMedianViews;
    const bucketHours: Record<TimeBucket, number[]> = {
      morning: [6, 7, 8, 9, 10, 11],
      afternoon: [12, 13, 14, 15, 16],
      evening: [17, 18, 19, 20],
      night: [21, 22, 23],
    };

    (Object.keys(bucketHours) as TimeBucket[]).forEach(b => {
      const bStat = dayStat.buckets[b];
      // Require at least 2 completed posts in this specific bucket to prevent 1-reel noise skew
      if (bStat && bStat.completedCount >= 2) {
        // Bayesian shrinkage weight: dampens small sample sizes
        // n=2 -> 0.40, n=3 -> 0.50, n=6 -> 0.67, n=12 -> 0.80
        const shrinkageWeight = bStat.completedCount / (bStat.completedCount + 3);
        const rawBoost = ((bStat.medianViews - overallMed) / overallMed) * 15;
        const clampedRaw = Math.max(-10, Math.min(15, rawBoost));
        const boosted = Math.round(clampedRaw * shrinkageWeight);

        bucketHours[b].forEach(h => {
          scores[h] = Math.max(15, Math.min(100, scores[h] + boosted));
        });
      }
    });
  }

  return scores;
}

function getQualityTier(score: number): 'peak' | 'prime' | 'good' | 'fallback' {
  if (score >= 90) return 'peak';
  if (score >= 80) return 'prime';
  if (score >= 68) return 'good';
  return 'fallback';
}

/**
 * Natural minute choices for human posting rather than robotic times:
 * 15, 20, 25, 35, 45, 50
 */
const NATURAL_MINUTES = [15, 20, 25, 35, 45, 50];

interface InternalSlotCandidate {
  dayLabel: 'Today' | 'Tomorrow';
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  totalMinutes: number;
  score: number;
  rationale: string;
  context: string;
}

/**
 * Robust Sequential Allocation:
 * Allocates slots sequentially across the daily viable window.
 * Strictly guarantees that slot[i] - slot[i-1] >= minSpacingMinutes (zero buffer violation, guaranteed).
 * Dynamically partitions the remaining day span so slots don't bunch at the start.
 */
function allocateSlotsForDay(params: {
  dayLabel: 'Today' | 'Tomorrow';
  count: number;
  startBoundaryMin: number;
  cutoffMin: number;
  minSpacingMinutes: number;
  scores: Record<number, number>;
  year: number;
  month: number;
  date: number;
}): InternalSlotCandidate[] {
  const { dayLabel, count, startBoundaryMin, cutoffMin, minSpacingMinutes, scores, year, month, date } = params;
  const candidates: InternalSlotCandidate[] = [];
  let currentEarliest = startBoundaryMin;

  for (let i = 0; i < count; i++) {
    const slotsRemainingAfter = count - 1 - i;
    // The latest possible minute this slot can take without starving subsequent slots of their buffer
    const latestForThisSlot = cutoffMin - (slotsRemainingAfter * minSpacingMinutes);
    const earliestForThisSlot = currentEarliest;

    // Proportional window to spread slots naturally across remaining hours
    const remainingSpan = Math.max(0, cutoffMin - earliestForThisSlot);
    const targetDuration = remainingSpan / (count - i);
    const winStart = earliestForThisSlot;
    const winEnd = Math.max(winStart, Math.min(latestForThisSlot, Math.round(earliestForThisSlot + targetDuration)));

    let bestCandidate: InternalSlotCandidate | null = null;
    let highestScore = -1;

    // Search through natural minutes in [winStart, winEnd]
    const startH = Math.floor(winStart / 60);
    const endH = Math.floor(winEnd / 60);

    for (let h = startH; h <= endH; h++) {
      for (const m of NATURAL_MINUTES) {
        const candidateTotalMin = h * 60 + m;
        // Strictly within the search window:
        // Guaranteed: candidateTotalMin >= winStart = earliestForThisSlot >= prevSlot + minSpacingMinutes
        // And candidateTotalMin <= winEnd <= latestForThisSlot
        if (candidateTotalMin < winStart || candidateTotalMin > winEnd) continue;

        const baseScore = scores[h] || 50;
        // Subtle natural preference for top notification times
        const minBonus = (m === 15 || m === 25) ? 3 : (m === 35 || m === 45 ? 2 : 1);
        const totalScore = Math.min(100, baseScore + minBonus);

        if (totalScore > highestScore) {
          highestScore = totalScore;
          const info = HOURLY_ENGAGEMENT_MAP[h] || { context: 'Prime Window', defaultRationale: 'Optimal audience reach' };
          bestCandidate = {
            dayLabel,
            year,
            month,
            date,
            hour: h,
            minute: m,
            totalMinutes: candidateTotalMin,
            score: totalScore,
            rationale: info.defaultRationale,
            context: info.context,
          };
        }
      }
    }

    // Fallback if strict spacing and natural minutes filter yielded no candidate in this window:
    // Pick the midpoint of [winStart, winEnd], strictly bounded by earliestForThisSlot and latestForThisSlot.
    // By definition, fallbackTotalMin >= earliestForThisSlot, so spacing is NEVER violated!
    if (!bestCandidate) {
      const fallbackTotalMin = Math.min(
        latestForThisSlot,
        Math.max(earliestForThisSlot, Math.round((winStart + winEnd) / 2))
      );
      const h = Math.floor(fallbackTotalMin / 60);
      const m = fallbackTotalMin % 60;
      const info = HOURLY_ENGAGEMENT_MAP[h] || { context: 'Active Slot', defaultRationale: 'Spaced engagement window' };

      bestCandidate = {
        dayLabel,
        year,
        month,
        date,
        hour: h,
        minute: m,
        totalMinutes: fallbackTotalMin,
        score: scores[h] || 65,
        rationale: info.defaultRationale,
        context: info.context,
      };
    }

    candidates.push(bestCandidate);
    // Crucial step: advance currentEarliest by at least minSpacingMinutes from the chosen slot
    currentEarliest = bestCandidate.totalMinutes + minSpacingMinutes;
  }

  return candidates;
}

/**
 * Core Algorithm: Generates an intelligently partitioned, remainder-day schedule
 * strictly after the current IST time, respecting minimum anti-cannibalization buffers.
 */
export function generateDailySlotPlan(params: {
  postType: PostType;
  count: number; // 1 to 6
  nowUTC?: string;
  posts: Post[];
}): SmartSlotPlan {
  const { postType, count, posts } = params;
  const targetCount = Math.max(1, Math.min(6, Math.round(count)));

  // 1. Current IST Reference
  const istNow = getISTParts(params.nowUTC || new Date());
  const currentTotalMinutes = istNow.totalMinutes;
  const currentAnchorIST = formatTimeIST(params.nowUTC || new Date());

  // Minimum anti-cannibalization spacing:
  // Option A (Trial): 50 mins buffer
  // Option B (Public): 80 mins buffer
  const minSpacingMinutes = postType === 'trial' ? 50 : 80;

  // Single precomputation of matrix stats on completed posts (avoids redundant recalculation)
  const completedPosts = posts.filter(p => p.views_24h !== null && p.views_24h !== undefined);
  const matrixStats = completedPosts.length >= 3 ? computeMatrixStats(completedPosts) : [];

  const todayDayStat = matrixStats.find(s => s.dayIndex === istNow.dayIndex);
  const tomorrowDayIndex = (istNow.dayIndex + 1) % 7;
  const tomorrowDayStat = matrixStats.find(s => s.dayIndex === tomorrowDayIndex);

  // Personalized quality scores for today and tomorrow with sample-size gating
  const todayScores = getPersonalizedHourlyScores(todayDayStat, istNow.dayIndex);
  const tomorrowScores = getPersonalizedHourlyScores(tomorrowDayStat, tomorrowDayIndex);

  // 2. Define viable window for TODAY
  // Earliest viable slot: current time + 25 mins buffer (gives creator prep/upload window)
  const earliestAllowedMinToday = currentTotalMinutes + 25;
  // Late night cutoff: 23:50 (11:50 PM IST) to prevent posting in the 1-5 AM dead zone
  const cutoffMinToday = 23 * 60 + 50;

  const availableSpanToday = cutoffMinToday - earliestAllowedMinToday;

  // Determine how many reels can comfortably fit today without violating minSpacingMinutes
  let numReelsToday = 0;
  if (availableSpanToday >= 0) {
    for (let k = targetCount; k >= 1; k--) {
      const minRequiredSpan = (k - 1) * minSpacingMinutes;
      if (availableSpanToday >= minRequiredSpan) {
        numReelsToday = k;
        break;
      }
    }
  }

  const selectedCandidates: InternalSlotCandidate[] = [];

  // 3. Allocate Today's Slots via Sequential Guaranteed-Spacing Allocation
  if (numReelsToday > 0) {
    const todayCandidates = allocateSlotsForDay({
      dayLabel: 'Today',
      count: numReelsToday,
      startBoundaryMin: earliestAllowedMinToday,
      cutoffMin: cutoffMinToday,
      minSpacingMinutes,
      scores: todayScores,
      year: istNow.year,
      month: istNow.month,
      date: istNow.date,
    });
    selectedCandidates.push(...todayCandidates);
  }

  // 4. Allocate Tomorrow's Spillover Slots if needed
  const neededTomorrow = targetCount - numReelsToday;
  let hasSpillover = false;
  let spilloverMessage: string | undefined = undefined;

  if (neededTomorrow > 0) {
    hasSpillover = true;

    // Exact tomorrow date in IST using createUTCFromIST to guarantee timezone safety and month rollover
    const tomorrowUtcIso = createUTCFromIST(istNow.year, istNow.month, istNow.date + 1, 12, 0);
    const tomParts = getISTParts(tomorrowUtcIso);

    // Tomorrow prime windows: 09:15 AM (555m) to 22:30 PM (1350m)
    const tomStartMin = 9 * 60 + 15;
    const tomEndMin = 22 * 60 + 30;

    const tomorrowCandidates = allocateSlotsForDay({
      dayLabel: 'Tomorrow',
      count: neededTomorrow,
      startBoundaryMin: tomStartMin,
      cutoffMin: tomEndMin,
      minSpacingMinutes,
      scores: tomorrowScores,
      year: tomParts.year,
      month: tomParts.month,
      date: tomParts.date,
    });
    selectedCandidates.push(...tomorrowCandidates);

    spilloverMessage = numReelsToday === 0
      ? `It is currently late night (${currentAnchorIST}). To protect your reach from the 1 AM – 5 AM dead zone, all ${targetCount} reels have been scheduled across tomorrow's prime retention windows.`
      : `Only ${numReelsToday} reel${numReelsToday > 1 ? 's' : ''} can fit today before the late-night cutoff with your ${minSpacingMinutes}m anti-cannibalization buffer. The remaining ${neededTomorrow} reel${neededTomorrow > 1 ? 's have' : ' has'} been mapped to tomorrow's peak discovery slots.`;
  }

  // 5. Convert candidates to final SmartSlot objects
  const finalSlots: SmartSlot[] = selectedCandidates.map((c, index) => {
    // Generate mathematically exact UTC ISO timestamp from IST year, month, date, hour, minute
    const utcIso = createUTCFromIST(c.year, c.month, c.date, c.hour, c.minute);
    const timeIST = formatTimeIST(utcIso);
    const bucket = getTimeBucket(utcIso);
    const tier = getQualityTier(c.score);

    return {
      slot_id: `smart_${c.dayLabel.toLowerCase()}_${index + 1}_${Date.now().toString(36)}`,
      timestampUTC: utcIso,
      timeIST,
      dateLabel: c.dayLabel,
      bucket,
      qualityTier: tier,
      qualityScore: c.score,
      rationale: c.rationale,
      windowContext: c.context,
    };
  });

  const executiveSummary = numReelsToday === targetCount
    ? `From current time ${currentAnchorIST}, we analyzed your remaining ${Math.max(1, Math.round(availableSpanToday / 60))} hours of viewer traffic and allocated ${targetCount} peak slots spaced with a ${minSpacingMinutes}m buffer:`
    : `From current time ${currentAnchorIST}, we scheduled ${numReelsToday} slot${numReelsToday > 1 ? 's' : ''} for today and ${neededTomorrow} peak slot${neededTomorrow > 1 ? 's' : ''} for tomorrow to prevent algorithm overlap:`;

  return {
    postType,
    requestedCount: targetCount,
    todayCount: numReelsToday,
    tomorrowCount: neededTomorrow,
    hasSpillover,
    spilloverMessage,
    executiveSummary,
    currentAnchorIST,
    slots: finalSlots,
  };
}
