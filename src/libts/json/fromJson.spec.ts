import { vi } from 'vitest';
import { log } from '../logging';
import { fromJson, fromJsonSafe } from './fromJson';

interface TestType {
  Name: string;
  Count: number;
}

describe('fromJson', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should deserialize a valid JSON string', () => {
    expect(fromJson('{"key": "value"}')).toEqual({ key: 'value' });
  });

  it('should return the input if it is not a string', () => {
    const input = { key: 'value' };
    expect(fromJson(input)).toBe(input);
  });

  it('should log the caller', () => {
    const debug = vi.spyOn(log, 'debug');
    fromJson('{}');
    expect(debug).toHaveBeenCalled();
  });
});

describe('fromJsonSafe', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should deserialize a valid JSON object to the type', () => {
    const result = fromJsonSafe<TestType>('{"Name": "test", "Count": 1}');
    expect(result).toEqual({ Name: 'test', Count: 1 });
    expect(result?.Count).toBe(1);
  });

  it('should deserialize a JSON array', () => {
    expect(fromJsonSafe<number[]>('[1, 2]')).toEqual([1, 2]);
  });

  it('should return null for empty input', () => {
    expect(fromJsonSafe('')).toBeNull();
    expect(fromJsonSafe(undefined)).toBeNull();
    expect(fromJsonSafe(null)).toBeNull();
  });

  it('should return null and log for invalid JSON', () => {
    const error = vi.spyOn(log, 'error');
    expect(fromJsonSafe('invalid json')).toBeNull();
    expect(error).toHaveBeenCalled();
  });

  it('should return null and warn when the JSON is not an object', () => {
    const warn = vi.spyOn(log, 'warn');
    expect(fromJsonSafe('123')).toBeNull();
    expect(fromJsonSafe('"text"')).toBeNull();
    expect(fromJsonSafe('null')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
