import { Pipe, PipeTransform } from '@angular/core';

/** 'ab12cd' as 'AB:12:CD': hex pairs, upper case; anything that is not hex is dropped */
export function formatFingerprint(value: string | null | undefined, separator = ':'): string {
  const hex = (value ?? '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  return hex.match(/.{1,2}/g)?.join(separator) ?? '';
}

@Pipe({ name: 'fingerprint' })
export class FingerprintPipe implements PipeTransform {
  transform(value: string | null | undefined, separator = ':'): string {
    return formatFingerprint(value, separator);
  }
}
