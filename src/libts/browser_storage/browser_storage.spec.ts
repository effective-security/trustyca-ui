import { MemoryStorage, Storage } from '.';
import { isFunction } from '../is';
import { IStorage } from './IStorage';

function testStorage(storage: IStorage) {
  expect(isFunction(storage.getItem)).toBeTruthy();
  expect(isFunction(storage.setItem)).toBeTruthy();
  expect(isFunction(storage.removeItem)).toBeTruthy();
  expect(isFunction(storage.clear)).toBeTruthy();
  expect(isFunction(storage.load)).toBeTruthy();
  expect(isFunction(storage.save)).toBeTruthy();
  expect(isFunction(storage.inMemory)).toBeTruthy();

  storage.setItem('string', '123');
  expect(storage.getItem('string')).toEqual('123');

  storage.save('test', 123);
  expect(storage.load('test')).toEqual(123);

  storage.save('test', '123');
  expect(storage.load('test')).toEqual('123');

  storage.save('test', { test: 'test' });
  expect(storage.load('test')).toEqual({ test: 'test' });

  // delete the key
  storage.removeItem('test');
  expect(storage.load('test')).toBeFalsy();
}

describe('Storage', () => {
  it('in memory', () => {
    const storage = new MemoryStorage();

    expect(storage.inMemory()).toBeTruthy();

    testStorage(storage);
  });

  it('in session', () => {
    const storage = new Storage().session;

    expect(storage.inMemory()).toBeFalsy();

    testStorage(storage);
  });

  it('in local', () => {
    const storage = new Storage().local;

    expect(storage.inMemory()).toBeFalsy();

    testStorage(storage);
  });

  it('persistedStorageDisabled', () => {
    const _window = {
      localStorage: null,
      sessionStorage: null,
    };

    const storage = new Storage(_window);

    expect(storage.local.inMemory()).toBeTruthy();
  });
});
