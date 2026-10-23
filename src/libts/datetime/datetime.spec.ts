import {
  compareDates,
  dateEndOfBusinessTomorrow,
  dateEndOfToday,
  dateEndOfTodayShort,
  dateOfBusinessTomorrow,
  dateWithinHoursFromNow,
  daysAgo,
  daysAgoString,
  daysAgoToLocalDateFormat,
  getObjectShortDate,
  getObjectShortDateTime,
  getObjectTime,
  localDateFormat,
  localDateTimeFormat,
  localTimeFormat,
  shortDateTime,
  timeAgoFormat,
  withinMinutes,
} from './datetime';

const _EMPTY = '';

describe('convertDateTimeProperties', () => {
  it('daysAgo()', () => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
      now = new Date(),
      today = {
        day: now.getDate(),
        month: now.getMonth(),
        year: now.getFullYear(),
      },
      past = {
        day: today.day - 1,
        month: today.month,
        year: today.year,
      };
    // JS days: 1-31
    if (past.day === 0) {
      past.month--;
      if (past.month < 0) {
        past.month--;
        past.month = 11;
      }
      // last day of the month
      past.day = daysInMonth[past.month];

      if (past.month === 1 && (past.year - 2000) % 4 === 0) {
        // 29 days in Feb every 4 years
        past.day++;
      }
    }

    const yesterdayDate = new Date(past.year, past.month, past.day, 4, 0, 0);

    /*
     window.console.log('today: ' + dt.toJson(today));
     window.console.log('past: ' + dt.toJson(past));

     window.console.log('Now: ' + now.toISOString());
     window.console.log('End of Today: ' + dateEndOfToday.toISOString());
     window.console.log('Yesterday: ' + yesterdayDate.toISOString());

     window.console.log('Delta now: ' + ((dateEndOfToday.getTime() - now.getTime()) / 86400000));
     window.console.log('Delta yesterday: ' + ((dateEndOfToday.getTime() - yesterdayDate.getTime()) / 86400000));
     */

    expect(daysAgo(now.toISOString())).toEqual(0);
    expect(daysAgo(dateEndOfToday().toISOString())).toEqual(0);
    expect(daysAgo(yesterdayDate.toISOString())).toEqual(1);

    //
    // Yesterday - end and middle and beginning of day
    //

    expect(
      daysAgo(
        new Date(past.year, past.month, past.day, 21, 59, 59).toISOString(), // Yesterday 21:59:59 GMT -07:00
      ),
    ).toEqual(1);

    expect(
      daysAgo(
        new Date(past.year, past.month, past.day, 12, 0, 0).toISOString(), // Yesterday 12:00:00 GMT -07:00
      ),
    ).toEqual(1);

    expect(
      daysAgo(
        new Date(past.year, past.month, past.day, 4).toISOString(), // Yesterday 04:00 GMT -07:00
      ),
    ).toEqual(1);

    //
    // First day of the month - end and beginning of day
    //

    expect(
      daysAgo(
        new Date(today.year, today.month, 1, 22, 58).toISOString(), // First Of The Month 22:59 GMT -07:00
      ),
    ).toEqual(now.getDate() - 1);

    expect(
      daysAgo(
        new Date(today.year, today.month, 1, 4, 0).toISOString(), // First Of The Month 04:00 GMT -07:00
      ),
    ).toEqual(now.getDate() - 1);

    //
    // 2am today -- This will pass if you run it after 2am
    //

    let d = new Date();
    d.setHours(2);
    d.setMinutes(0); // Today at 02:00 GMT -07:00 -- This will pass if you run it after 2am
    expect(daysAgo(d.toISOString())).toEqual(0);

    //
    // Today beginning of day
    //

    d = new Date();
    d.setHours(4);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0); // Today at 00:00 GMT -07:00
    expect(daysAgo(d.toISOString())).toEqual(0);
  });

  it('localTimeFormat()', () => {
    expect(localTimeFormat(undefined)).toEqual(_EMPTY);
    expect(localTimeFormat('0')).toEqual(_EMPTY);
    // expect(localTimeFormat('2015-05-31T06:47:20.4799093+00:00')).toEqual(
    //     '11:47 pm',
    // )
  });

  it('localDateFormat()', () => {
    const time = new Date(),
      invalidString1 = '000',
      invalidString2 = '0001-01-01 00:00:00.0000000 +00:00',
      validDate1 = new Date(invalidString1),
      // Create Jan 1, 0001 in local time to avoid timezone day-shift issues
      validDate2 = new Date(1, 0, 1), // Year 1, Month 0 (Jan), Day 1
      invalidDate = new Date(undefined as any);

    expect(localDateFormat(validDate1)).toEqual('Jan 1');
    expect(localDateFormat(validDate2)).toEqual('Jan 1');
    expect(localDateFormat(0)).toEqual(_EMPTY);
    expect(localDateFormat(invalidDate)).toEqual(_EMPTY);
    expect(localDateFormat(invalidString1)).toEqual(_EMPTY);
    expect(localDateFormat(invalidString2)).toEqual(_EMPTY);
    // expect(localDateFormat(1)).toEqual('Dec 31')

    expect(localDateFormat(undefined)).toEqual(_EMPTY);
    expect(localDateFormat('0')).toEqual(_EMPTY);
    // expect(localDateFormat('2015-05-31T06:47:20.4799093+00:00')).toEqual(
    //     'May 30',
    // )
    expect(localDateFormat(time.toISOString())).toEqual('Today');
  });

  it('localDateTimeFormat()', () => {
    const time = new Date();

    expect(localDateTimeFormat(undefined)).toEqual(_EMPTY);
    expect(localDateTimeFormat('0')).toEqual(_EMPTY);
    // expect(
    //     localDateTimeFormat('2015-05-31T06:47:20.4799093+00:00'),
    // ).toEqual('May 30, 11:47 pm')
    expect(localDateTimeFormat(time.toISOString())).toEqual(localTimeFormat(time.toISOString()));
  });

  it('daysAgoToLocalDateFormat()', () => {
    const time = new Date();

    expect(daysAgoToLocalDateFormat(undefined as any)).toEqual('Today');
    expect(daysAgoToLocalDateFormat(0)).toEqual('Today');

    time.setDate(time.getDate() - 1);
    expect(daysAgoToLocalDateFormat(1)).toEqual(localDateFormat(time));
  });

  it('timeAgoFormat()', () => {
    const time = new Date();

    expect(timeAgoFormat(undefined)).toEqual(_EMPTY);
    expect(timeAgoFormat('0')).toEqual(_EMPTY);
    expect(timeAgoFormat(time.toISOString())).toEqual('a few seconds ago');
    time.setHours(time.getHours() - 2);
    expect(timeAgoFormat(time.toISOString())).toContain('2 hours ago');
    time.setDate(time.getDate() - 2);
    expect(timeAgoFormat(time.toISOString())).toContain('2 days ago');
  });

  it('withinMinutes()', () => {
    const time = new Date(),
      twoMinsAgo = new Date(Date.now() - 1000 * 60 * 2);

    expect(typeof withinMinutes(undefined, undefined, undefined)).toEqual('boolean');
    expect(withinMinutes(undefined, undefined, undefined)).toBeFalsy();
    expect(withinMinutes(time.toISOString(), 1, undefined)).toBeTruthy();
    expect(withinMinutes(time.toISOString(), 15, undefined)).toBeTruthy();
    expect(withinMinutes(time.toISOString(), 5, 15)).toBeFalsy();

    expect(withinMinutes(twoMinsAgo, 1, undefined)).toBeFalsy();
    expect(withinMinutes(twoMinsAgo.toISOString(), 1, undefined)).toBeFalsy();

    expect(withinMinutes(twoMinsAgo, 3, undefined)).toBeTruthy();
    expect(withinMinutes(twoMinsAgo.toISOString(), 3, undefined)).toBeTruthy();

    expect(withinMinutes(twoMinsAgo, 1, 3)).toBeTruthy();
    expect(withinMinutes(twoMinsAgo.toISOString(), 1, 3)).toBeTruthy();
  });

  it('dateEndOfBusinessTomorrow()', () => {
    const time = new Date(),
      tomorrow = dateEndOfBusinessTomorrow();

    expect(tomorrow.getTime()).toBeGreaterThan(time.getTime());
    expect(localDateTimeFormat(tomorrow)).toContain('11:59 pm');
  });

  it('dateOfBusinessTomorrow()', () => {
    const time = new Date(),
      tomorrow = dateOfBusinessTomorrow();

    expect(tomorrow.getTime()).toBeGreaterThan(time.getTime());
    expect(localDateTimeFormat(tomorrow)).toContain('8:00 am');
  });

  it('dateWithinHoursFromNow()', () => {
    const now = new Date();
    const earlier = dateWithinHoursFromNow(-0.25).getTime(), // 15 mins
      later = dateWithinHoursFromNow(1),
      time = now.getTime(),
      diffEarlier = time - earlier,
      diffLater = later.getTime() - time;

    expect(earlier).toBeLessThan(time);
    expect(later.getTime()).toBeGreaterThan(time);
    expect(later.getDay()).toBe((now.getHours() < 23 ? 0 : 1) + now.getDay());

    expect(diffEarlier).toBeGreaterThan(14 * 60000);
    expect(diffLater).toBeGreaterThan(59 * 60000);
  });

  it('compareDates()', () => {
    const now = new Date();
    const earlier = dateWithinHoursFromNow(-0.25), // 15 mins
      later = dateWithinHoursFromNow(1);

    expect(compareDates(now, now)).toBe(0);
    expect(compareDates(earlier, now)).toBe(-1);
    expect(compareDates(now, earlier)).toBe(1);
    expect(compareDates(now, undefined)).toBe(1);
    expect(compareDates(undefined, now)).toBe(-1);
    expect(compareDates(undefined, undefined)).toBe(0);
    expect(compareDates(earlier, later)).toBe(-1);
    expect(compareDates(later, earlier)).toBe(1);
  });
});

describe('getObjectTime', () => {
  it('should return a Date object for valid RFC3339 string fields', () => {
    const obj = {
      validDate: '2023-10-01T12:00:00Z',
      invalidDate: 'invalid-date',
      emptyDate: '',
    };

    expect(getObjectTime(obj, 'validDate')).toBeInstanceOf(Date);
    expect(getObjectTime(obj, 'validDate')?.toISOString()).toEqual('2023-10-01T12:00:00.000Z');

    expect(getObjectTime(obj, 'invalidDate')).toBeInstanceOf(Date);
    expect(getObjectTime(obj, 'emptyDate')).toBeUndefined();
    expect(getObjectTime(obj, 'nonExistentField')).toBeUndefined();
  });
});

describe('dateEndOfTodayShort', () => {
  it('should return the end of today in short date format', () => {
    const endOfTodayShort = dateEndOfTodayShort();
    expect(endOfTodayShort).toEqual(localDateFormat(dateEndOfToday()));
    expect(endOfTodayShort).toEqual(dateEndOfTodayShort());
  });
});

describe('shortDateTime', () => {
  it('should return the date string in "D MMM HH:mm" format', () => {
    const date = new Date(Date.UTC(2023, 9, 1, 12, 0, 0)); // Use UTC to avoid time zone issues
    const dateString = '2023-10-01T12:00:00Z';

    expect(shortDateTime(date)).toHaveLength(11);
    // expect(shortDateTime(date)).toEqual('1 Oct 13:00')
    expect(shortDateTime(dateString)).toHaveLength(11);
    // expect(shortDateTime(dateString)).toEqual('1 Oct 13:00')
  });

  it('should handle invalid dates gracefully', () => {
    const invalidDate = 'invalid-date';
    const emptyDate = '';

    expect(shortDateTime(invalidDate)).toEqual('Invalid date');
    expect(shortDateTime(emptyDate)).toEqual('');
  });
});

describe('daysAgoString', () => {
  it('should return "Today" for the current date', () => {
    const now = new Date();
    expect(daysAgoString(now)).toEqual('Today');
  });

  it('should return "Yesterday" for the date one day ago', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(daysAgoString(yesterday)).toEqual('Yesterday');
  });

  it('should return "# days ago" for dates more than one day ago', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(daysAgoString(twoDaysAgo)).toEqual('2 days ago');

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    expect(daysAgoString(tenDaysAgo)).toEqual('10 days ago');
  });

  it('should return "--" for future dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(daysAgoString(tomorrow)).toEqual('--');
  });
});

describe('getObjectShortDate', () => {
  it('should return the date string in "DD MMM YYYY" format from an object field', () => {
    const obj = {
      validDate: '2023-10-01T12:00:00Z',
      invalidDate: 'invalid-date',
      emptyDate: '',
    };

    expect(getObjectShortDate(obj, 'validDate')).toEqual('01 Oct 2023');
    expect(getObjectShortDate(obj, 'invalidDate')).toEqual('Invalid date');
    expect(getObjectShortDate(obj, 'emptyDate')).toEqual('');
    expect(getObjectShortDate(obj, 'nonExistentField')).toEqual('');
  });
});

describe('getObjectShortDateTime', () => {
  it('should return the date string in "D MMM HH:mm" format from an object field', () => {
    const obj = {
      validDate: '2023-10-01T12:00:00Z',
      invalidDate: 'invalid-date',
      emptyDate: '',
    };

    //expect(getObjectShortDateTime(obj, 'validDate')).toEqual('1 Oct 13:00')
    expect(getObjectShortDateTime(obj, 'validDate')).toHaveLength(11);
    expect(getObjectShortDateTime(obj, 'invalidDate')).toEqual('Invalid date');
    expect(getObjectShortDateTime(obj, 'emptyDate')).toEqual('');
    expect(getObjectShortDateTime(obj, 'nonExistentField')).toEqual('');
  });
});
