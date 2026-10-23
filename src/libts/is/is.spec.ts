import * as is from '.';

describe('is functions', () => {
  it('isUndefined', () => {
    expect(is.isUndefined(undefined)).toBeTruthy();

    const a = undefined;
    const b = 1,
      c = false,
      d = null;

    expect(is.isUndefined(a)).toBeTruthy();

    expect(is.isUndefined(b)).toBeFalsy();
    expect(is.isUndefined(c)).toBeFalsy();
    expect(is.isUndefined(d)).toBeFalsy();
  });

  it('isDefined', () => {
    expect(is.isUndefined(undefined)).toBeTruthy();

    const a = undefined;
    const b = 1,
      c = false,
      d = null;

    expect(is.isDefined(a)).toBeFalsy();

    expect(is.isDefined(b)).toBeTruthy();
    expect(is.isDefined(c)).toBeTruthy();
    expect(is.isDefined(d)).toBeTruthy();
  });

  it('isObject', () => {
    const a = undefined;
    const b = 1,
      c = false,
      d = null,
      e = () => undefined,
      o1 = {},
      o2: unknown[] = [],
      o3 = new Date();

    expect(is.isObject(a)).toBeFalsy();
    expect(is.isObject(b)).toBeFalsy();
    expect(is.isObject(c)).toBeFalsy();
    expect(is.isObject(d)).toBeFalsy();
    expect(is.isObject(e)).toBeFalsy();
    expect(is.isObject(o1)).toBeTruthy();
    expect(is.isObject(o2)).toBeTruthy();
    expect(is.isObject(o3)).toBeTruthy();
  });

  it('isArray', () => {
    const a = undefined;
    const b = 1,
      c = false,
      d = null,
      e = () => undefined,
      o1 = {},
      o2: unknown[] = [],
      o3 = new Date();

    expect(is.isArray(a)).toBeFalsy();
    expect(is.isArray(b)).toBeFalsy();
    expect(is.isArray(c)).toBeFalsy();
    expect(is.isArray(d)).toBeFalsy();
    expect(is.isArray(e)).toBeFalsy();
    expect(is.isArray(o1)).toBeFalsy();
    expect(is.isArray(o2)).toBeTruthy();
    expect(is.isArray(o3)).toBeFalsy();
  });

  it('isFunction', () => {
    const a = undefined;
    const b = 1,
      c = false,
      d = null,
      e = () => undefined,
      o1 = {},
      o2: unknown[] = [],
      o3 = new Date();

    expect(is.isFunction(a)).toBeFalsy();
    expect(is.isFunction(b)).toBeFalsy();
    expect(is.isFunction(c)).toBeFalsy();
    expect(is.isFunction(d)).toBeFalsy();
    expect(is.isFunction(e)).toBeTruthy();
    expect(is.isFunction(o1)).toBeFalsy();
    expect(is.isFunction(o2)).toBeFalsy();
    expect(is.isFunction(o3)).toBeFalsy();
  });

  it('isNumber', () => {
    const a = undefined;
    const b = 1,
      c = false,
      d = null,
      e = () => undefined,
      o1 = {},
      o2: unknown[] = [],
      o3 = new Date();

    expect(is.isNumber(a)).toBeFalsy();
    expect(is.isNumber(b)).toBeTruthy();
    expect(is.isNumber(c)).toBeFalsy();
    expect(is.isNumber(d)).toBeFalsy();
    expect(is.isNumber(e)).toBeFalsy();
    expect(is.isNumber(o1)).toBeFalsy();
    expect(is.isNumber(o2)).toBeFalsy();
    expect(is.isNumber(o3)).toBeFalsy();
  });
});
