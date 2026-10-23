/**
 * @ngdoc function
 * @name toJson
 * @module libts
 * @kind function
 *
 * @description
 * Serializes input into a JSON-formatted string. Properties with leading $$ characters will be
 * stripped since angular uses this notation internally.
 *
 * @param {Object|Array|Date|string|number} obj Input to be serialized into JSON.
 * @param {boolean|number} [pretty=2] If set to true, the JSON output will contain newlines and whitespace.
 *    If set to an integer, the JSON output will contain that many spaces per indentation.
 * @returns {string|undefined} JSON-ified string representing `obj`.
 */
export function toJson(obj: any, pretty = 0): string {
  if (typeof obj === 'undefined') {
    return 'undefined';
  }

  return JSON.stringify(obj, null /* toJsonReplacer */, pretty);
}

/**
 * @ngdoc function
 * @name toJsonReplacer
 * @module libts
 * @kind function
 *
 * @description
 * Serializes input into a JSON-formatted string, with sorted keys.
 *
 * @param {string} key Property key.
 * @param {any} value Property value.
 * @returns {any} Property value.
 */
export function toJsonWithSortedKeys(input: object): string {
  return JSON.stringify(input, Object.keys(input).sort());
}

/**
 * @ngdoc function
 * @name omitEmpty
 * @module libts
 * @kind function
 *
 * @description
 * Removes empty values from an object.
 *
 * @param {Object} obj Input object.
 * @returns {Object} Object with empty values removed.
 *
 */
export function omitEmptyReplacer(key: string, value: any) {
  // Skip values that are false, 0, null, empty string, or empty objects
  if (value === false || value === 0 || value === '' || value === null) {
    return undefined; // `undefined` removes the key from the final JSON
  }

  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
    return undefined;
  }

  return value; // Keep everything else
}

/**
 * @ngdoc function
 * @name cacheKey
 * @module libts
 * @kind function
 *
 * @description
 *  Generates a cache key for a given prefix and input.
 */
export function cacheKey(prefix: string, input: any): string {
  if (typeof input === 'undefined' || input === null) {
    return prefix + ':null';
  }
  const keys = Object.keys(input)
    .filter((key) => omitEmptyReplacer(key, input[key]) !== undefined) // Keep only non-omitted keys
    .sort(); // Sort alphabetically

  return prefix + ':' + JSON.stringify(input, keys);
}
