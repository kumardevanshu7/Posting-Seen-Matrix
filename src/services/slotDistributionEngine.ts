import { Post, PostType, TimeBucket } from '../types';
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
 */
function getPersonalizedHourlyScores(posts: Post[], dayIndex: number): Record<number, number> {
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

  // Creator's empirical data overlay
  if (posts.length >= 3) {
    try {
      const stats = computeMatrixStats(posts);
      const dayStat = stats.find(s => s.dayIndex === dayIndex);
      if (dayStat && dayStat.totalCompletedPosts > 0 && dayStat.overallMedianViews > 0) {
        const overallMed = dayStat.overallMedianViews;
        const bucketHours: Record<TimeBucket, number[]> = {
          morning: [6, 7, 8, 9, 10, 11],
          afternoon: [12, 13, 14, 15, 16],
          evening: [17, 18, 19, 20],
          night: [21, 22, 23],
        };

        (Object.keys(bucketHours) as TimeBucket[]).forEach(b => {
          const bStat = dayStat.buckets[b];
          if (bStat && bStat.completedCount > 0) {
            const boost = Math.round(((bStat.medianViews - overallMed) / overallMed) * 15);
            const clamped = Math.max(-10, Math.min(15, boost));
            bucketHours[b].forEach(h => {
              scores[h] = Math.max(15, Math.min(100, scores[h] + clamped));
            });
          }
        });
      }
    } catch {
      // Fallback cleanly to research baselines
    }
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

  // Personalized quality scores for today and tomorrow
  const todayScores = getPersonalizedHourlyScores(posts, istNow.dayIndex);
  const tomorrowDayIndex = (istNow.dayIndex + 1) % 7;
  const tomorrowScores = getPersonalizedHourlyScores(posts, tomorrowDayIndex);

  // 2. Define viable window for TODAY
  // Earliest viable slot: current time + 25 mins buffer (gives creator prep/upload window)
  const earliestAllowedMinToday = currentTotalMinutes + 25;
  // Late night cutoff: 23:50 (11:50 PM IST) to prevent posting in the 1-5 AM dead zone
  const cutoffMinToday = 23 * 60 + 50;

  const availableSpanToday = cutoffMinToday - earliestAllowedMinToday;

  // Determine how many reels can comfortably fit today
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

  // Helper to pick the best natural slot within an assigned target window [winStart, winEnd]
  const pickBestSlotInWindow = (
    winStart: number,
    winEnd: number,
    scores: Record<number, number>,
    dayLabel: 'Today' | 'Tomorrow',
    year: number,
    month: number,
    date: number,
    prevSlotMin?: number
  ): InternalSlotCandidate => {
    let bestCandidate: InternalSlotCandidate | null = null;
    let highestScore = -1;

    // Search through all natural minutes within this target window
    const startH = Math.floor(winStart / 60);
    const endH = Math.floor(winEnd / 60);

    for (let h = startH; h <= endH; h++) {
      for (const m of NATURAL_MINUTES) {
        const candidateTotalMin = h * 60 + m;
        if (candidateTotalMin < winStart || candidateTotalMin > winEnd) continue;

        // Must respect minimum buffer spacing from previous slot
        if (prevSlotMin !== undefined && (candidateTotalMin - prevSlotMin) < minSpacingMinutes) {
          continue;
        }

        const baseScore = scores[h] || 50;
        // Subtle natural minute preference (e.g. :15 and :25 are high-converting notification times)
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

    // Fallback if strict spacing eliminated all natural candidates: pick safe forward step
    if (!bestCandidate) {
      const fallbackTotalMin = Math.min(
        winEnd,
        prevSlotMin !== undefined ? prevSlotMin + minSpacingMinutes : winStart
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

    return bestCandidate;
  };

  // 3. Allocate Today's Slots via Proportional Zone Partitioning
  if (numReelsToday > 0) {
    const zoneDuration = availableSpanToday / numReelsToday;

    for (let i = 0; i < numReelsToday; i++) {
      const zoneStart = Math.round(earliestAllowedMinToday + i * zoneDuration);
      const zoneEnd = Math.round(earliestAllowedMinToday + (i + 1) * zoneDuration);
      const prevMin = selectedCandidates.length > 0 
        ? selectedCandidates[selectedCandidates.length - 1].totalMinutes 
        : undefined;

      const chosen = pickBestSlotInWindow(
        zoneStart,
        zoneEnd,
        todayScores,
        'Today',
        istNow.year,
        istNow.month,
        istNow.date,
        prevMin
      );

      selectedCandidates.push(chosen);
    }
  }

  // 4. Allocate Tomorrow's Spillover Slots if needed
  const neededTomorrow = targetCount - numReelsToday;
  let hasSpillover = false;
  let spilloverMessage: string | undefined = undefined;

  if (neededTomorrow > 0) {
    hasSpillover = true;

    // Tomorrow date parts
    const tomorrowRef = new Date(Date.UTC(istNow.year, istNow.month, istNow.date + 1));
    const tomParts = getISTParts(tomorrowRef);

    // Tomorrow prime windows: 09:15 AM (555m) to 22:30 PM (1350m)
    const tomStartMin = 9 * 60 + 15;
    const tomEndMin = 22 * 60 + 30;
    const tomAvailableSpan = tomEndMin - tomStartMin;
    const tomZoneDuration = tomAvailableSpan / neededTomorrow;

    let prevTomMin: number | undefined = undefined;

    for (let j = 0; j < neededTomorrow; j++) {
      const zoneStart = Math.round(tomStartMin + j * tomZoneDuration);
      const zoneEnd = Math.round(tomStartMin + (j + 1) * tomZoneDuration);

      const chosen = pickBestSlotInWindow(
        zoneStart,
        zoneEnd,
        tomorrowScores,
        'Tomorrow',
        tomParts.year,
        tomParts.month,
        tomParts.date,
        prevTomMin
      );

      selectedCandidates.push(chosen);
      prevTomMin = chosen.totalMinutes;
    }

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
