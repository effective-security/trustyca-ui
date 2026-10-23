import { toJson } from '../json';
import { log } from '../logging';
import { IStorage } from './IStorage';

/**
 * Writes an object to the storage as JSON.
 *
 * @param key
 * @param obj
 *  pass null to delete the data
 * @returns {*}
 */
export function saveJsonToStorage(storage: IStorage, key: string, obj: any): any {
  try {
    if (obj === null || obj === undefined) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, toJson(obj));
    }
  } catch (e: any) {
    log.error('api=saveJsonToStorage, error=' + e.toString());
  }

  return obj;
}
