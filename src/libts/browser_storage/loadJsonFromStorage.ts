import { fromJson } from '../json';
import { log } from '../logging';
import { IStorage } from './IStorage';

/**
 * Reads a JSON object from the storage.
 *
 * @param key
 * @returns {*}
 */
export function loadJsonFromStorage(storage: IStorage, key: string): any {
  let val;

  try {
    val = storage.getItem(key);
    if (val !== undefined) {
      val = fromJson(val);
    }
  } catch (e: any) {
    log.error('api=storageRead, error=' + e.toString());
    val = undefined;
  }

  return val;
}
