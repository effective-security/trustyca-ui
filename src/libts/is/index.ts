export const toString = Object.prototype.toString;

/**
 * @ngdoc function
 * @name isUndefined
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a reference is undefined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is undefined.
 */
export function isUndefined(value: any) {
  return typeof value === 'undefined';
}

/**
 * @ngdoc function
 * @name isDefined
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a reference is defined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is defined.
 */
export function isDefined(value: any) {
  return typeof value !== 'undefined';
}

/**
 * @ngdoc function
 * @name isObject
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a reference is an `Object`. Unlike `typeof` in JavaScript, `null`s are not
 * considered to be objects. Note that JavaScript arrays are objects.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Object` but not `null`.
 */
export function isObject(value: any) {
  // http://jsperf.com/isobject4
  return value !== null && typeof value === 'object';
}

/**
 * @ngdoc function
 * @name isArray
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a reference is an `Array`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Array`.
 */
export const isArray = Array.isArray;

/**
 * @ngdoc function
 * @name isFunction
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a reference is a `Function`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Function`.
 */
export function isFunction(value: any) {
  return typeof value === 'function';
}

/**
 * @ngdoc function
 * @name isNumber
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a reference is a `Number`.
 *
 * This includes the "special" numbers `NaN`, `+Infinity` and `-Infinity`.
 *
 * If you wish to exclude these then you can use the native
 * [`isFinite'](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isFinite)
 * method.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Number`.
 */
export function isNumber(value: any) {
  return typeof value === 'number';
}

/**
 * @ngdoc function
 * @name isString
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a reference is a `String`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `String`.
 */
export function isString(value: any) {
  return typeof value === 'string';
}

/**
 * @ngdoc function
 * @name isBoolean
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a reference is a `Boolean`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Boolean`.
 */
export function isBoolean(value: any) {
  return typeof value === 'boolean';
}

/**
 * @ngdoc function
 * @name isDate
 * @module libts
 * @kind function
 *
 * @description
 * Determines if a value is a date.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Date`.
 */
export function isDate(value: any) {
  return value instanceof Date || toString.call(value) === '[object Date]';
}

/**
 * Determines if a value is a regular expression object.
 *
 * @private
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `RegExp`.
 */
export function isRegExp(value: any) {
  return toString.call(value) === '[object RegExp]';
}

/**
 * Checks if `obj` is a window object.
 *
 * @private
 * @param {*} obj Object to check
 * @returns {boolean} True if `obj` is a window obj.
 */
export function isWindow(obj: any) {
  return obj && obj.window === obj;
}
