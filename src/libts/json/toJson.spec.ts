import { cacheKey, toJsonWithSortedKeys } from './toJson';

describe('toJson', () => {
  it('toJsonWithSortedKeys()', () => {
    const input = {
      b: 2,
      a: 1,
      z: false,
      str: 'hello',
      emptyStr: '',
      emptyObj: {},
      nilObj: null,
      zero: 0,
    };
    expect(toJsonWithSortedKeys(input)).toEqual(
      '{"a":1,"b":2,"emptyObj":{},"emptyStr":"","nilObj":null,"str":"hello","z":false,"zero":0}',
    );
    expect(cacheKey('_m', input)).toEqual('_m:{"a":1,"b":2,"str":"hello"}');
    expect(cacheKey('_n', undefined)).toEqual('_n:null');
  });
});
