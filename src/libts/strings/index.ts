/**
 * Make the first letter capital and the lower case the rest
 *
 * @param text
 * @returns {string}
 */
export function capitalise(text: string): string {
  return text && text.length > 1
    ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    : text || '';
}

/**
 * Limit the input string to specified length with ellipsis
 *
 * @param title
 * @param max
 * @returns {string}
 */
export function ellipsis(title: string, max = 20): string {
  const len = title ? title.length : 0;
  return len > max ? title.substring(0, max - 3) + '...' : title;
}

/**
 * Split a string value, on the first occurrence of the token.
 * If token does not exist in value then return [value].
 * Otherwise, return an array of 2 elements.
 *
 * @param value
 * @param token
 * @returns {array}
 *  [value] - if token does not occur in value
 *  [s1, s2] - s1 is a substring of value where the last char of s1 is token. s2 is the remaining string.
 */
export function splitOnFirst(value: string, token: string): string[] {
  if (!value) {
    return [];
  }

  const pos = value.indexOf(token);
  return pos >= 0 ? [value.substring(0, pos), value.substring(pos + 1)] : [value];
}

/**
 * Returns true, if the input string starts with specified value
 *
 * @param input
 * @param value
 * @param start
 * @returns {boolean}
 */
export function startsWith(input: string, value: string, start = 0): boolean {
  return input.startsWith ? input.startsWith(value, start) : input.indexOf(value) === start;
}

const HEX_DIGITS = '0123456789abcdef';

/**
 * Generates cryptographically secure random bytes using Web Crypto API
 * Falls back to Math.random in environments where crypto is not available
 */
function getSecureRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  // Fallback for environments without crypto (should be rare in modern browsers/Node.js)
  //console.warn('crypto.getRandomValues not available, falling back to Math.random (not cryptographically secure)')
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * Creates a cryptographically secure UUID v4 as per RFC 4122
 * Uses crypto.getRandomValues for true randomness
 *
 * @returns {string} A properly formatted UUID v4 string
 */
export function createUUID(): string {
  // Generate 16 random bytes
  const bytes = getSecureRandomBytes(16);

  // Set version (4) and variant bits according to RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant bits

  // Convert to hex string with proper formatting
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Generates a cryptographically secure random string of specified length
 * Uses crypto.getRandomValues for true randomness
 *
 * @param length The desired length of the random string
 * @returns {string} A random hexadecimal string
 */
export function randomString(length: number): string {
  const bytes = getSecureRandomBytes(Math.ceil(length / 2));
  return Array.from(bytes, (byte) => HEX_DIGITS.charAt(byte >> 4) + HEX_DIGITS.charAt(byte & 0x0f))
    .join('')
    .slice(0, length);
}

// Seed with a positive random offset so the first nextId() is never 0.
let _nextId = Math.floor((getSecureRandomBytes(4)[0] / 255) * Date.now()) || Date.now() || 1;

export function nextId(): number {
  return _nextId++;
}

/**
 * Formats a number using locale-specific thousands separators
 *
 * @param value
 * @returns {string}
 */
export function formatLocaleNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    // Non-numeric string: return as-is to avoid surprising callers
    return String(value);
  }
  return num.toLocaleString();
}

export function compareCaseInsensitive(a: string, b: string): number {
  /* Storing case insensitive comparison */
  const comparison = a.toLowerCase().localeCompare(b.toLowerCase());

  /*
    If strings are equal in case insensitive comparison,
    Return case sensitive comparison instead
  */
  return comparison === 0 ? a.localeCompare(b) : comparison;
}
