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
 * Converts a UTC ISO date string to a Date object adjusted for IST (Indian Standard Time).
 */
export function getISTDate(utcDateStr: string | Date): Date {
  const d = typeof utcDateStr === 'string' ? new Date(utcDateStr) : utcDateStr;
  // Compute local UTC millis then add 5.5 hours
  const utcMillis = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utcMillis + (IST_OFFSET_MINUTES * 60000));
}

/**
 * Returns formatted time string in IST, e.g. "02:14 PM IST"
 */
export function formatTimeIST(utcDateStr: string): string {
  try {
    const ist = getISTDate(utcDateStr);
    let hours = ist.getHours();
    const minutes = ist.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour should be 12
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    const hourStr = hours < 10 ? '0' + hours : hours;
    return `${hourStr}:${minStr} ${ampm} IST`;
  } catch {
    return 'Invalid Time';
  }
}

/**
 * Returns formatted date string in IST, e.g. "Mon, 23 Sep"
 */
export function formatDateIST(utcDateStr: string, includeYear = false): string {
  try {
    const ist = getISTDate(utcDateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[ist.getDay()];
    const dateNum = ist.getDate();
    const monthName = months[ist.getMonth()];
    const year = ist.getFullYear();

    return includeYear 
      ? `${dayName}, ${dateNum} ${monthName} ${year}` 
      : `${dayName}, ${dateNum} ${monthName}`;
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Returns full readable IST timestamp, e.g. "Mon, 23 Sep • 02:14 PM IST"
 */
export function formatFullIST(utcDateStr: string): string {
  return `${formatDateIST(utcDateStr, false)} • ${formatTimeIST(utcDateStr)}`;
}

/**
 * Returns the day of the week in IST (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getISTDayOfWeek(utcDateStr: string): number {
  const ist = getISTDate(utcDateStr);
  return ist.getDay();
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
export function getTimeBucket(utcDateStr: string): TimeBucket {
  const ist = getISTDate(utcDateStr);
  const hour = ist.getHours();

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

export function getCheckInStatus(postedAtUTC: string): CheckInStatus {
  const postDate = new Date(postedAtUTC).getTime();
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
