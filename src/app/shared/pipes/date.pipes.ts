import { Pipe, PipeTransform } from '@angular/core';
import { DateStyle, expiresIn, formatTime, relativeTime } from './time';

/** An RFC 3339 timestamp in local time: 'Oct 31, 2026, 11:25 AM'; '' when unset */
@Pipe({ name: 'rfc3339Date' })
export class Rfc3339DatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, style: DateStyle = 'medium'): string {
    return formatTime(value, style);
  }
}

/** 'in 3 days', '2 hours ago'; '' when unset */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return relativeTime(value);
  }
}

/** 'expires in 12 days', 'expired 3 days ago'; '' when unset */
@Pipe({ name: 'expiresIn' })
export class ExpiresInPipe implements PipeTransform {
  transform(notAfter: string | Date | null | undefined): string {
    return expiresIn(notAfter);
  }
}
