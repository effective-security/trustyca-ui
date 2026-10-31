import { timeAgoFormat } from 'src/libts/datetime';

/**
 * The time of an RFC 3339 string or a Date, or undefined for an empty,
 * invalid or zero value (the server's zero time is year 1)
 */
export function parseTime(value: string | Date | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) || d.getTime() <= 0 ? undefined : d;
}

const DATE_FORMATS = {
  /** Oct 31, 2026, 11:25 AM */
  medium: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
  /** 10/31/26, 11:25 AM */
  short: new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }),
  /** Oct 31, 2026 */
  date: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }),
  /** Oct 31, 2026, 11:25:07 AM */
  long: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }),
};

export type DateStyle = keyof typeof DATE_FORMATS;

/** A timestamp in local time, '' when unset */
export function formatTime(value: string | Date | null | undefined, style: DateStyle = 'medium') {
  const d = parseTime(value);
  return d ? DATE_FORMATS[style].format(d) : '';
}

/** 'in 3 days', '2 hours ago', '' when unset */
export function relativeTime(value: string | Date | null | undefined): string {
  const d = parseTime(value);
  return d ? timeAgoFormat(d) : '';
}

export type ExpiryState = 'none' | 'expired' | 'soon' | 'ok';

/** Within this many days an expiry is "soon" */
export const EXPIRY_SOON_DAYS = 30;

export function expiryState(
  notAfter: string | Date | null | undefined,
  now = Date.now(),
  soonDays = EXPIRY_SOON_DAYS,
): ExpiryState {
  const d = parseTime(notAfter);
  if (!d) {
    return 'none';
  }
  const left = d.getTime() - now;
  if (left <= 0) {
    return 'expired';
  }
  return left <= soonDays * 86_400_000 ? 'soon' : 'ok';
}

/** 'expires in 12 days', 'expired 3 days ago', '' when unset */
export function expiresIn(notAfter: string | Date | null | undefined, now = Date.now()): string {
  const d = parseTime(notAfter);
  if (!d) {
    return '';
  }
  const text = timeAgoFormat(d, true);
  return d.getTime() - now <= 0 ? `expired ${text} ago` : `expires in ${text}`;
}
