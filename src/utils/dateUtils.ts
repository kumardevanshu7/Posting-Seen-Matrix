import { TimeBucket } from '../types';

// IST offset is UTC + 5 hours 30 minutes = +330 minutes
export const IST_OFFSET_MINUTES = 330;

/**
 * Returns the current date in UTC ISO format.
 */
export function getCurrentUTC(): string {
  return new Date().toISOString();
}

/**
 * Converts any UTC date or ISO string to an IST-shifted Date object.
 * When accessing components, use UTC methods (getUTCHours, getUTCMinutes, etc.)
 * so the output is 100% consistent across any local browser timezone.
 */
export function getISTDate(utcDateStr: string | Date = new Date()): Date {
  const d = typeof utcDateStr === 'string' ? new Date(utcDateStr) : utcDateStr;
  return new Date(d.getTime() + (IST_OFFSET_MINUTES * 60000));
}

/**
 * Extracts exact IST date and time components independent of the user's local browser timezone.
 */
export function getISTParts(dateOrIso: string | Date = new Date()) {
  const istDate = getISTDate(dateOrIso);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth(),
    date: istDate.getUTCDate(),
    dayIndex: istDate.getUTCDay(),
    hours: istDate.getUTCHours(),
    minutes: istDate.getUTCMinutes(),
    seconds: istDate.getUTCSeconds(),
    totalMinutes: istDate.getUTCHours() * 60 + istDate.getUTCMinutes(),
  };
}

/**
 * Constructs a valid UTC ISO string from exact IST year, month, date, hours, minutes.
 */
export function createUTCFromIST(
  year: number,
  month: number,
  date: number,
  hours: number,
  minutes: number
): string {
  const fakeUtcMillis = Date.UTC(year, month, date, hours, minutes, 0, 0);
  const actualUtcMillis = fakeUtcMillis - (IST_OFFSET_MINUTES * 60000);
  return new Date(actualUtcMillis).toISOString();
}

/**
 * Returns formatted time string in IST, e.g. "05:15 PM IST"
 */
export function formatTimeIST(utcDateStr: string | Date): string {
  try {
    const ist = getISTDate(utcDateStr);
    let hours = ist.getUTCHours();
    const minutes = ist.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour should be 12
    const minStr = minutes < 10 ? '0' + minutes : minutes.toString();
    const hourStr = hours < 10 ? '0' + hours : hours.toString();
    return `${hourStr}:${minStr} ${ampm} IST`;
  } catch {
    return 'Invalid Time';
  }
}

/**
 * Returns formatted date string in IST, e.g. "Wed, 23 Sep"
 */
export function formatDateIST(utcDateStr: string | Date, includeYear = false): string {
  try {
    const ist = getISTDate(utcDateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[ist.getUTCDay()];
    const dateNum = ist.getUTCDate();
    const monthName = months[ist.getUTCMonth()];
    const year = ist.getUTCFullYear();

    return includeYear 
      ? `${dayName}, ${dateNum} ${monthName} ${year}` 
      : `${dayName}, ${dateNum} ${monthName}`;
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Returns full readable IST timestamp, e.g. "Wed, 23 Sep • 05:15 PM IST"
 */
export function formatFullIST(utcDateStr: string | Date): string {
  return `${formatDateIST(utcDateStr, false)} • ${formatTimeIST(utcDateStr)}`;
}

/**
 * Returns the day of the week in IST (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getISTDayOfWeek(utcDateStr: string | Date): number {
  const ist = getISTDate(utcDateStr);
  return ist.getUTCDay();
}

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Categorizes an IST timestamp into one of 4 daily buckets:
 * - Morning: 06:00 - 11:59
 * - Afternoon: 12:00 - 16:59
 * - Evening: 17:00 - 20:59
 * - Night: 21:00 - 05:59
 */
export function getTimeBucket(utcDateStr: string | Date): TimeBucket {
  const ist = getISTDate(utcDateStr);
  const hour = ist.getUTCHours();

  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export const TIME_BUCKET_CONFIG: Record<TimeBucket, { label: string; range: string; icon: string; defaultSuggestedHour: number }> = {
  morning: {
    label: 'Morning',
    range: '06:00 AM – 11:59 AM',
    icon: 'Sunrise',
    defaultSuggestedHour: 9, // 9:30 AM
  },
  afternoon: {
    label: 'Afternoon',
    range: '12:00 PM – 04:59 PM',
    icon: 'Sun',
    defaultSuggestedHour: 14, // 2:15 PM
  },
  evening: {
    label: 'Evening',
    range: '05:00 PM – 08:59 PM',
    icon: 'Sunset',
    defaultSuggestedHour: 19, // 7:30 PM
  },
  night: {
    label: 'Night',
    range: '09:00 PM – 05:59 AM',
    icon: 'Moon',
    defaultSuggestedHour: 22, // 10:00 PM
  }
};

/**
 * Calculates 24h check-in timing and state.
 */
export interface CheckInStatus {
  isReady: boolean;
  timeRemainingMs: number;
  timeRemainingFormatted: string;
  checkInUnlockTimeUTC: string;
}

/**
 * Calculates 24h check-in timing and state.
 * For promoted trial→public posts, uses promoted_to_public_at as the timer start (not posted_at).
 * This preserves original posted_at for matrix bucketing while gating the public 24h window correctly.
 */
export function getCheckInStatus(postedAtUTC: string, promotedToPublicAt?: string | null): CheckInStatus {
  // Use promotion timestamp for timer if available (promoted trial→public), else original posted_at
  const timerStartISO = promotedToPublicAt || postedAtUTC;
  const postDate = new Date(timerStartISO).getTime();
  const unlockDate = postDate + 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = unlockDate - now;

  const isReady = diff <= 0;
  const timeRemainingMs = Math.max(0, diff);

  let formatted = 'Ready now';
  if (!isReady) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      formatted = `${hours}h ${minutes}m left`;
    } else if (minutes > 0) {
      formatted = `${minutes}m ${seconds}s left`;
    } else {
      formatted = `${seconds}s left`;
    }
  }

  return {
    isReady,
    timeRemainingMs,
    timeRemainingFormatted: formatted,
    checkInUnlockTimeUTC: new Date(unlockDate).toISOString(),
  };
}

/**
 * Returns current week identifier in format YYYY-Wxx or YYYY-MM-DD (Monday of current week)
 */
export function getStartOfWeekDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}
