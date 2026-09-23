import { Post, PostType, TimeBucket } from '../types';
import { getISTDate, getTimeBucket, getISTDayOfWeek, formatTimeIST } from '../utils/dateUtils';
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
}

export interface SmartSlotPlan {
  postType: PostType;
  requestedCount: number;
  todayCount: number;
  tomorrowCount: number;
  hasSpillover: boolean;
  spilloverMessage?: string;
  slots: SmartSlot[];
}

/**
 * Baseline hourly quality score for Instagram Reels (00:00 to 23:00 IST).
 * Derived from empirical social benchmarks (Lunch spike 12-2 PM, Evening peak 6:30-9 PM, Dead zone 1-5 AM).
 */
const HOURLY_RESEARCH_BASELINES: Record<number, { score: number; rationale: string }> = {
  0: { score: 32, rationale: 'Late night winding down • Low engagement velocity' },
  1: { score: 10, rationale: 'Dead zone • Algorithm penalty floor' },
  2: { score: 10, rationale: 'Dead zone • Minimum audience activity' },
  3: { score: 10, rationale: 'Dead zone • Lowest impression window' },
  4: { score: 12, rationale: 'Pre-dawn • Minimal active reach' },
  5: { score: 25, rationale: 'Early morning • Sporadic early risers' },
  6: { score: 45, rationale: 'Morning wake-up • Initial mobile check-in' },
  7: { score: 52, rationale: 'Morning routine • Light casual scrolling' },
  8: { score: 58, rationale: 'Commute start • Short-form video appetite' },
  9: { score: 68, rationale: 'Mid-morning break • Work & study transitions' },
  10: { score: 70, rationale: 'Morning focus break • High swipe engagement' },
  11: { score: 72, rationale: 'Pre-lunch pickup • Steady audience build-up' },
  12: { score: 84, rationale: 'Lunch spike • High mobile activity across audiences' },
  13: { score: 86, rationale: 'Mid-lunch peak • Strong retention for short hooks' },
  14: { score: 78, rationale: 'Post-lunch transition • Stable afternoon engagement' },
  15: { score: 65, rationale: 'Afternoon tea lull • Moderate reach velocity' },
  16: { score: 68, rationale: 'Late afternoon • Audience returning to mobile' },
  17: { score: 82, rationale: 'Work wrap-up & commute • Surge in recreational scrolling' },
  18: { score: 92, rationale: 'Early evening peak • Prime reel discovery window' },
  19: { score: 98, rationale: 'Maximum prime window • Highest daily retention & shares' },
  20: { score: 96, rationale: 'Peak prime time • High engagement across all age groups' },
  21: { score: 85, rationale: 'Post-dinner relaxation • Strong watch time completion' },
  22: { score: 74, rationale: 'Night leisure scroll • Good for thoughtful or deep hooks' },
  23: { score: 50, rationale: 'Late night drop-off • Reduced initial 30-min velocity' },
};

/**
 * Returns customized hourly scores blending research baselines with the creator's historical stats.
 */
function getPersonalizedHourlyScores(posts: Post[], dayIndex: number): Record<number, number> {
  const scores: Record<number, number> = {};

  // Initialize with baseline
  for (let h = 0; h < 24; h++) {
    scores[h] = HOURLY_RESEARCH_BASELINES[h].score;
  }

  // Day of week modifiers (Wednesday / Tuesday / Thursday mid-week boosts)
  if (dayIndex === 3 || dayIndex === 2) {
    // Tue, Wed prime boost
    for (let h = 17; h <= 21; h++) scores[h] = Math.min(100, scores[h] + 4);
  } else if (dayIndex === 0) {
    // Sunday night surge (7 PM - 10 PM)
    for (let h = 19; h <= 22; h++) scores[h] = Math.min(100, scores[h] + 5);
  }

  // Creator's empirical data overlay
  if (posts.length >= 3) {
    try {
      const stats = computeMatrixStats(posts);
      const todayStats = stats.find(s => s.dayIndex === dayIndex);
      if (todayStats && todayStats.totalCompletedPosts > 0) {
        const overallMed = todayStats.overallMedianViews;

        // Bucket to hour ranges
        const bucketHours: Record<TimeBucket, number[]> = {
          morning: [6, 7, 8, 9, 10, 11],
          afternoon: [12, 13, 14, 15, 16],
          evening: [17, 18, 19, 20],
          night: [21, 22, 23],
        };

        (Object.keys(bucketHours) as TimeBucket[]).forEach(b => {
          const bStat = todayStats.buckets[b];
          if (bStat && bStat.completedCount > 0 && overallMed > 0) {
            const performanceBoost = Math.round(((bStat.medianViews - overallMed) / overallMed) * 15);
            const clampedBoost = Math.max(-10, Math.min(15, performanceBoost));

            bucketHours[b].forEach(h => {
              scores[h] = Math.max(15, Math.min(100, scores[h] + clampedBoost));
            });
          }
        });
      }
    } catch {
      // Fallback to baseline if stats computation fails
    }
  }

  return scores;
}

/**
 * Maps a numerical quality score to a tier.
 */
function getQualityTier(score: number): 'peak' | 'prime' | 'good' | 'fallback' {
  if (score >= 88) return 'peak';
  if (score >= 75) return 'prime';
  if (score >= 60) return 'good';
  return 'fallback';
}

/**
 * Generates an on-demand, spaced posting schedule for N reels in the remaining hours of today.
 * If today's viable hours are exhausted, spills over gracefully to tomorrow.
 */
export function generateDailySlotPlan(params: {
  postType: PostType;
  count: number; // 1 to 6
  nowUTC?: string; // Optional reference, defaults to now
  posts: Post[];
}): SmartSlotPlan {
  const { postType, count, posts } = params;
  const targetCount = Math.max(1, Math.min(6, Math.round(count)));
  const now = params.nowUTC ? new Date(params.nowUTC) : new Date();

  // Current IST Date & Time
  const istNow = getISTDate(now.toISOString());
  const currentDayIndex = istNow.getDay();
  const currentHour = istNow.getHours();
  const currentMinute = istNow.getMinutes();

  // Minimum spacing between consecutive posts:
  // Trial: 50 mins buffer (can test more rapidly)
  // Public: 80 mins buffer (allow algorithm distribution breathing room)
  const minSpacingMinutes = postType === 'trial' ? 50 : 80;

  // Personalized quality scores for today and tomorrow
  const todayScores = getPersonalizedHourlyScores(posts, currentDayIndex);
  const tomorrowScores = getPersonalizedHourlyScores(posts, (currentDayIndex + 1) % 7);

  // 1. Generate eligible 15-minute slot candidates for TODAY (after current time + 15 mins buffer)
  const startMinuteToday = Math.ceil((currentHour * 60 + currentMinute + 15) / 15) * 15;
  const latestViableMinuteToday = 23 * 60 + 30; // 11:30 PM cutoff to avoid dead zone

  interface Candidate {
    dayLabel: 'Today' | 'Tomorrow';
    minuteOfDay: number;
    hour: number;
    minute: number;
    score: number;
    rationale: string;
    targetDateIST: Date;
  }

  const todayCandidates: Candidate[] = [];

  for (let m = startMinuteToday; m <= latestViableMinuteToday; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const baseScore = todayScores[h];

    // Minor minute-level micro-optimizations (e.g. :15 and :30 are standard viewing windows)
    const microBoost = (min === 15 || min === 30 || min === 45) ? 1 : 0;
    const finalScore = Math.min(100, baseScore + microBoost);

    const d = new Date(istNow);
    d.setHours(h, min, 0, 0);

    todayCandidates.push({
      dayLabel: 'Today',
      minuteOfDay: m,
      hour: h,
      minute: min,
      score: finalScore,
      rationale: HOURLY_RESEARCH_BASELINES[h]?.rationale || 'Optimal viewing window',
      targetDateIST: d,
    });
  }

  // 2. Greedy selection for today with minimum spacing
  const selectedSlots: Candidate[] = [];
  const sortedToday = [...todayCandidates].sort((a, b) => b.score - a.score);

  for (const cand of sortedToday) {
    if (selectedSlots.length >= targetCount) break;

    // Check spacing against already selected slots
    const hasConflict = selectedSlots.some(
      s => Math.abs(s.minuteOfDay - cand.minuteOfDay) < minSpacingMinutes
    );

    if (!hasConflict) {
      selectedSlots.push(cand);
    }
  }

  // Sort chronologically
  selectedSlots.sort((a, b) => a.minuteOfDay - b.minuteOfDay);

  const todayCount = selectedSlots.length;
  let hasSpillover = false;
  let spilloverMessage: string | undefined = undefined;

  // 3. If today doesn't have enough viable slots (e.g. requested 4 at 10 PM), spillover to TOMORROW
  if (selectedSlots.length < targetCount) {
    hasSpillover = true;
    const neededTomorrow = targetCount - selectedSlots.length;

    // Tomorrow candidate pool (09:00 AM to 21:30 PM prime hours)
    const tomorrowCandidates: Candidate[] = [];
    const tomorrowStartMin = 9 * 60; // 9:00 AM
    const tomorrowEndMin = 21 * 60 + 30; // 9:30 PM

    const tomorrowIST = new Date(istNow);
    tomorrowIST.setDate(tomorrowIST.getDate() + 1);

    for (let m = tomorrowStartMin; m <= tomorrowEndMin; m += 15) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const baseScore = tomorrowScores[h];

      const d = new Date(tomorrowIST);
      d.setHours(h, min, 0, 0);

      tomorrowCandidates.push({
        dayLabel: 'Tomorrow',
        minuteOfDay: m,
        hour: h,
        minute: min,
        score: baseScore,
        rationale: HOURLY_RESEARCH_BASELINES[h]?.rationale || 'Prime daytime window',
        targetDateIST: d,
      });
    }

    const sortedTomorrow = [...tomorrowCandidates].sort((a, b) => b.score - a.score);
    const selectedTomorrow: Candidate[] = [];

    for (const cand of sortedTomorrow) {
      if (selectedTomorrow.length >= neededTomorrow) break;

      const hasConflict = selectedTomorrow.some(
        s => Math.abs(s.minuteOfDay - cand.minuteOfDay) < minSpacingMinutes
      );

      if (!hasConflict) {
        selectedTomorrow.push(cand);
      }
    }

    selectedTomorrow.sort((a, b) => a.minuteOfDay - b.minuteOfDay);
    selectedSlots.push(...selectedTomorrow);

    spilloverMessage = todayCount === 0
      ? `It is currently late evening. To avoid the dead-zone engagement penalty (1 AM – 5 AM), all ${targetCount} reels have been scheduled for tomorrow's highest-retention windows.`
      : `Only ${todayCount} prime slot${todayCount > 1 ? 's remain' : ' remains'} today before the late-night drop-off. The remaining ${neededTomorrow} reel${neededTomorrow > 1 ? 's have' : ' has'} been planned for tomorrow's peak windows.`;
  }

  // 4. Transform candidates into final SmartSlot objects with exact UTC and IST strings
  const finalSlots: SmartSlot[] = selectedSlots.map((s, idx) => {
    // Convert targetDateIST back to UTC ISO string
    // IST = UTC + 5h30m, so UTC millis = istMillis - (330 * 60 * 1000)
    const istTimeMillis = s.targetDateIST.getTime();
    const utcMillis = istTimeMillis - (330 * 60 * 1000);
    const utcIso = new Date(utcMillis).toISOString();

    const bucket = getTimeBucket(utcIso);
    const tier = getQualityTier(s.score);

    return {
      slot_id: `slot_${s.dayLabel.toLowerCase()}_${idx + 1}_${Date.now().toString(36)}`,
      timestampUTC: utcIso,
      timeIST: formatTimeIST(utcIso),
      dateLabel: s.dayLabel,
      bucket,
      qualityTier: tier,
      qualityScore: s.score,
      rationale: s.rationale,
    };
  });

  return {
    postType,
    requestedCount: targetCount,
    todayCount,
    tomorrowCount: finalSlots.length - todayCount,
    hasSpillover,
    spilloverMessage,
    slots: finalSlots,
  };
}
