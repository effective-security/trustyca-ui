import { mapToObject, normalizeObject, objToMap } from '.';

describe('maps utility functions', () => {
  describe('objToMap', () => {
    it('should convert an object to a Map', () => {
      const obj = { key1: 'value1', key2: 'value2' };
      const map = objToMap(obj);
      expect(map).toBeInstanceOf(Map);
      expect(map?.get('key1')).toBe('value1');
      expect(map?.get('key2')).toBe('value2');
    });

    it('should return undefined if input is undefined', () => {
      const map = objToMap(undefined);
      expect(map).toBeUndefined();
    });
  });

  describe('mapToObject', () => {
    it('should convert a Map to an object', () => {
      const map = new Map<string, string>([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const obj = mapToObject(map);
      expect(obj).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should return undefined if input is undefined', () => {
      const obj = mapToObject(undefined);
      expect(obj).toBeUndefined();
    });
  });

  describe('normalizeObject', () => {
    it('should convert an array of key-value pairs to an object', () => {
      const data = [
        ['key1', 'value1'],
        ['key2', 'value2'],
      ];
      const obj = normalizeObject(data);
      expect(obj).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should return the input if it is already an object', () => {
      const data = { key1: 'value1', key2: 'value2' };
      const obj = normalizeObject(data);
      expect(obj).toEqual(data);
    });

    it('should return an empty object for invalid input', () => {
      const data = 'invalid input';
      const obj = normalizeObject(data);
      expect(obj).toEqual({});
    });
  });
});
