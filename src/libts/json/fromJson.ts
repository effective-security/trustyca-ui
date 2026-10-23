import { isString } from '../is';
import { log } from '../logging';

/**
 * @ngdoc function
 * @name fromJson
 * @module libts
 * @kind function
 *
 * @description
 * Deserializes a JSON string.
 *
 * @param {string} json JSON string to deserialize.
 * @returns {Object|Array|string|number} Deserialized JSON string.
 */
export function fromJson(json: string | any): any {
  // TODO: remove fromJson in the code as much as possible,
  // log the caller to find the usage of fromJson
  log.debug('fromJson:', new Error().stack?.split('\n')[2]?.trim().split(' ')[1]);
  return isString(json) ? JSON.parse(json) : json;
}

/**
 * Parses a JSON string that must hold an object or an array.
 *
 * Returns null, and logs, when the input is empty, is not valid JSON or does
 * not hold an object; it never throws. Replaces the Sentry-reporting variants
 * of secdi-ui, which this project does not use.
 */
export function fromJsonSafe<T>(json: string | null | undefined): T | null {
  if (!json) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as T;
    }
    log.warn('fromJsonSafe: JSON does not hold an object');
    return null;
  } catch (error) {
    log.error('fromJsonSafe:', error);
    return null;
  }
}
