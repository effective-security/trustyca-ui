import { isDate } from '../is';

const MILLISECONDS_IN_DAY = 86400000;
const INVALID_DATE = 'Invalid date';
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// The formatters below render local time with English month names, as the
// moment formats they replace did ('MMM D', 'h:mm a', 'DD MMM YYYY', ...).

function toDate(value: any): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function hour12(hours: number): number {
  const h = hours % 12;
  return h === 0 ? 12 : h;
}

function meridiem(hours: number, upper = false): string {
  const m = hours < 12 ? 'am' : 'pm';
  return upper ? m.toUpperCase() : m;
}

/** 'MMM D', e.g. 'Jan 15' */
function formatMonthDay(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** 'h:mm a' (or 'h:mm A' when upper), e.g. '4:56 pm' */
function formatTime(d: Date, upper = false): string {
  return `${hour12(d.getHours())}:${pad2(d.getMinutes())} ${meridiem(d.getHours(), upper)}`;
}

function formatOrInvalid(d: Date, format: (d: Date) => string): string {
  return isNaN(d.getTime()) ? INVALID_DATE : format(d);
}

// End of the day
let _dateEndTodayMs = 0;
function _dateEndTodayMsFromCache() {
  const nowMs = Date.now();
  if (nowMs > _dateEndTodayMs) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    _dateEndTodayMs = d.getTime(); // - 1000;
  }

  return _dateEndTodayMs;
}

/**
 * String in format: 'Today', or 'Jan 15' in local time of the #days ago
 *
 * @param days
 * @returns {*}
 */
export function daysAgoToLocalDateFormat(days: number) {
  if (!days) {
    return 'Today';
  }

  const dateTime = new Date();
  dateTime.setDate(dateTime.getDate() - days);

  return formatMonthDay(dateTime);
}

/**
 * Returns number of second past since time specified
 *
 * @param time
 * @returns {number}
 */
export function secondsSince(time: any) {
  return (Date.now() - (time instanceof Date ? time.getTime() : time)) / 1000;
}

/**
 * Returns number of minutes past since time
 *
 * @param time
 * @returns {number}
 */
export function minutesSince(time: any) {
  return Math.floor(secondsSince(time) / 60);
}

/**
 * Returns number of hours past since time specified
 *
 * @param time
 * @returns {number}
 */
export function hoursSince(time: any) {
  return Math.floor(secondsSince(time) / 3600);
}

/**
 * Returns number of days past since time specified
 *
 * @param time
 * @returns {number}
 */
export function daysSince(time: any) {
  return Math.floor(secondsSince(time) / 86400);
}

/**
 * Returns number of days from the time specified
 *
 * @param time
 * @returns {number}
 */
export function daysFromNow(time: any) {
  return -daysSince(time);
}

/**
 * Add # of days to the time specified
 *
 * @param days
 * @param time
 * @returns {Date}
 */
export function addDays(days: any, time: any) {
  time = time || new Date();

  return new Date(time.getTime() + days * MILLISECONDS_IN_DAY);
}

/**
 *
 * @param dateTime, Date object or string in UTC format
 * @returns {number} of calendar days between now and dateTime
 */
export function daysAgo(dateTime: any): number {
  const date = toDate(dateTime),
    dateTimeMs = date.getTime(),
    dateTodayEndMs = _dateEndTodayMsFromCache();

  return Math.floor((dateTodayEndMs - dateTimeMs) / MILLISECONDS_IN_DAY);
}

/**
 * Returns string in format: 'Today', 'Yesterday', or '# days ago'
 * @param dateTime
 * @returns
 */
export function daysAgoString(dateTime: any): string {
  if (!isValidDate(dateTime)) {
    return 'Never';
  }
  const days = daysAgo(dateTime);
  if (days < 0) {
    return '--';
  }
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days + ' days ago';
}

/**
 * Returns the Date of the end of the day today
 *
 * @returns {Date}
 */
export function dateEndOfToday(): Date {
  return new Date(_dateEndTodayMsFromCache());
}

let _dateEndOfTodayShortCached = '';
export function dateEndOfTodayShort(): string {
  if (!_dateEndOfTodayShortCached) {
    _dateEndOfTodayShortCached = localDateFormat(dateEndOfToday());
  }
  return _dateEndOfTodayShortCached;
}

/**
 * Handles the case where Date returned from DB is in '0000-00-..' format instead of NULL
 *
 * @param dateTime
 * @returns {*}
 */
export function isValidDate(dateTime: any) {
  if (!dateTime) {
    return false;
  }

  const type = typeof dateTime;

  if (type === 'string') {
    return dateTime.charAt(0) !== '0';
  } else if (type === 'number') {
    return dateTime > 0;
  } else if (dateTime instanceof Date) {
    return !isNaN(dateTime.getTime());
  }
  return false;
}

/**
 * String in format: 'HH:MM AM|PM' in local time format
 *
 * @param dateTime, Date object or string in UTC format
 * @returns {*}
 */
export function localTimeFormat(dateTime: any) {
  if (!isValidDate(dateTime)) {
    return '';
  }

  return formatOrInvalid(toDate(dateTime), (d) => formatTime(d));
}

/**
 * String in format: 'Today', or 'Jan 15' in local time
 *
 * @param dateTime, Date object or string in UTC format
 * @returns {*}
 */
export function localDateFormat(dateTime: any) {
  if (!isValidDate(dateTime)) {
    return '';
  }

  return formatOrInvalid(toDate(dateTime), (d) => (daysAgo(d) !== 0 ? formatMonthDay(d) : 'Today'));
}

/**
 * String in format: 'Jan 15 2015' in local time
 *
 * @param dateTime, Date object or string in UTC format
 * @returns {*}
 */
export function localDateWithYearFormat(dateTime: any) {
  if (!isValidDate(dateTime)) {
    return 'Never';
  }

  return formatOrInvalid(toDate(dateTime), (d) => `${formatMonthDay(d)} ${d.getFullYear()}`);
}

/**
 * String in format: '3:56 am', or 'Jan 15, 4:56 pm' in local time
 *
 * @param dateTime, Date object or string in UTC format
 * @returns {*}
 */
export function localDateTimeFormat(dateTime: any) {
  if (!isValidDate(dateTime)) {
    return '';
  }

  return formatOrInvalid(toDate(dateTime), (d) =>
    daysAgo(d) !== 0 ? `${formatMonthDay(d)}, ${formatTime(d)}` : formatTime(d),
  );
}

/**
 * String in format: '10:15' or 'Jan 15' in local time
 *
 * @param dateTime, Date object or string in UTC format
 * @returns {*}
 */
export function localTimeOrDateFormat(dateTime: any) {
  if (!isValidDate(dateTime)) {
    return '';
  }

  return formatOrInvalid(toDate(dateTime), (d) =>
    daysAgo(d) !== 0 ? formatMonthDay(d) : formatTime(d),
  );
}

/**
 * Relative time with the thresholds of moment's `fromNow`:
 * 'a few seconds', 'a minute', '5 minutes', 'an hour', '2 hours', 'a day',
 * '3 days', 'a month', '4 months', 'a year', '2 years'.
 */
function relativeTime(diffMs: number): string {
  const seconds = Math.round(Math.abs(diffMs) / 1000);
  if (seconds < 45) {
    return 'a few seconds';
  }
  if (seconds < 90) {
    return 'a minute';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 45) {
    return `${minutes} minutes`;
  }
  if (minutes < 90) {
    return 'an hour';
  }
  const hours = Math.round(minutes / 60);
  if (hours < 22) {
    return `${hours} hours`;
  }
  if (hours < 36) {
    return 'a day';
  }
  const days = Math.round(hours / 24);
  if (days < 26) {
    return `${days} days`;
  }
  if (days < 46) {
    return 'a month';
  }
  if (days < 320) {
    return `${Math.round(days / 30.4)} months`;
  }
  if (days < 548) {
    return 'a year';
  }
  return `${Math.round(days / 365)} years`;
}

/**
 * String in format: 'a day ago' or 'in 5 days'
 *
 * @param dateTime, Date object or string in UTC format
 * @param noSuffix
 * @returns {*}
 */
export function timeAgoFormat(dateTime: any, noSuffix = false) {
  if (!isValidDate(dateTime)) {
    return '';
  }

  return formatOrInvalid(toDate(dateTime), (d) => {
    const diff = Date.now() - d.getTime();
    const text = relativeTime(diff);
    if (noSuffix) {
      return text;
    }
    return diff < 0 ? `in ${text}` : `${text} ago`;
  });
}

/**
 * Check if the specified date was within 'minutes' from now
 *
 * @param dateTime
 * @param from
 * @param to
 *
 * @returns {bool}
 */
export function withinMinutes(dateTime: any, from: any, to: any) {
  if (!isValidDate(dateTime)) {
    return false;
  }

  const diff = Math.floor((Date.now() - toDate(dateTime).getTime()) / 60000); // difference in mins

  return to !== undefined ? diff > from && diff < to : diff < from;
}

/**
 * Time of the end of the next business day
 * @returns {Date}
 */
export function dateEndOfBusinessTomorrow() {
  const d = new Date();
  let date = d.getDate();

  switch (d.getDay()) {
    case 5:
      date += 3;
      break;
    case 6:
      date += 2;
      break;
    default:
      date += 1;
  }

  d.setDate(date);
  d.setHours(23);
  d.setMinutes(59);
  return d;
}

/**
 * Time of the next business day, at 8am
 * @returns {Date}
 */
export function dateOfBusinessTomorrow() {
  const d = new Date();
  let date = d.getDate();

  switch (d.getDay()) {
    case 5:
      date += 3;
      break;
    case 6:
      date += 2;
      break;
    default:
      date += 1;
  }

  d.setDate(date);
  d.setHours(8);
  d.setMinutes(0);
  return d;
}

/**
 * Returns new Date of # of hours from now
 * @param hours
 * @returns {Date}
 */
export function dateWithinHoursFromNow(hours: any) {
  return new Date(Date.now() + Math.round(hours * 3600000));
}

/**
 * Returns comparison result
 * @param d1{Date}
 * @param d2{Date}
 * @returns {number}
 */
export function compareDates(d1?: Date, d2?: Date): number {
  let v1 = 0;
  let v2 = 0;
  if (d1) {
    v1 = d1.getTime();
  }
  if (d2) {
    v2 = d2.getTime();
  }
  if (v1 < v2) {
    return -1;
  }
  if (v1 > v2) {
    return 1;
  }
  return 0;
}

/**
 * Returns Date from protobuf
 * @param pb
 * @returns {Date}
 */
export function fromPbTime(pb: any): Date {
  return new Date(pb.seconds * 1000 + pb.nanos / 1000000);
}

/**
 * Returns Date string in 'DD MMM YYYY' format
 * @param d
 * @returns {string}
 */
export function shortDate(d: Date | string): string {
  if (!d) {
    return '';
  }
  return formatOrInvalid(
    isDate(d) ? (d as Date) : new Date(d),
    (date) => `${pad2(date.getDate())} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`,
  );
}

/**
 * Returns Date string in 'h:mm A' format
 * @param d
 * @returns {string}
 */
export function shortTime(d: Date | string): string {
  if (!d) {
    return '';
  }
  return formatOrInvalid(isDate(d) ? (d as Date) : new Date(d), (date) => formatTime(date, true));
}

/**
 * Returns Date string in 'D MMM HH:mm' format
 * @param d
 * @returns {string}
 */
export function shortDateTime(d: Date | string): string {
  if (!d) {
    return '';
  }
  return formatOrInvalid(
    isDate(d) ? (d as Date) : new Date(d),
    (date) =>
      `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  );
}

/**
 * Returns Date from an object field
 * @param obj
 * @param field name
 * @returns {Date|undefined}
 */
export function getObjectTime(obj: any, field: string): Date | undefined {
  if (!obj || !obj[field]) {
    return undefined;
  }

  const cached = '_$' + field;
  if (!obj[cached]) {
    obj[cached] = new Date(obj[field]);
  }

  return obj[cached];
}

/**
 * Returns Date string in 'DD MMM YYYY' format from an object field
 * @param obj
 * @param field name
 * @returns {string}
 */
export function getObjectShortDate(obj: any, field: string): string {
  const d = getObjectTime(obj, field);
  return d ? shortDate(d) : '';
}

/**
 * Returns Date string in 'D MMM HH:mm' format from an object field
 * @param obj
 * @param field name
 * @returns {string}
 */
export function getObjectShortDateTime(obj: any, field: string): string {
  const d = getObjectTime(obj, field);
  return d ? shortDateTime(d) : '';
}

/**
 * Returns the number of whole calendar months from `from` to `to`
 */
function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) {
    months--;
  }
  return months;
}

/**
 * Returns a string representing the age of the given date in format:
 * 'X Days' if less than a month, otherwise 'X Months'
 *
 * @param dateTime Date object or string in UTC format
 * @returns {string}
 */
export function ageString(dateTime: any): string {
  if (!isValidDate(dateTime)) {
    return '';
  }
  const date = toDate(dateTime);
  if (isNaN(date.getTime())) {
    return INVALID_DATE;
  }
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / MILLISECONDS_IN_DAY);

  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'Day' : 'Days'}`;
  }
  const diffInMonths = monthsBetween(date, now);

  return `${diffInMonths} ${diffInMonths === 1 ? 'Month' : 'Months'}`;
}
