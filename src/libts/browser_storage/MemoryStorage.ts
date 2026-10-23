import { IStorage } from './IStorage';
import { loadJsonFromStorage } from './loadJsonFromStorage';
import { saveJsonToStorage } from './saveJsonToStorage';

export class MemoryStorage implements IStorage {
  private storage: any;

  constructor() {
    this.clear();
  }

  public inMemory(): boolean {
    return true;
  }

  /**
   * will empty all keys out of the storage.
   */
  public clear(): void {
    this.storage = {};
  }

  /**
   * When passed a key name, will return that key's value.
   *
   * @param key
   * @returns {*}
   */
  public getItem(key: string): string {
    return this.storage[key];
  }

  /**
   * When passed a key name and value, will add that key to the storage, or update that key's value if it already exists.
   *
   * @param key
   * @param obj
   * @returns {*}
   */
  public setItem(key: string, value: string): void {
    if (value === null || value === undefined) {
      delete this.storage[key];
    } else {
      this.storage[key] = value;
    }
  }

  /**
   * When passed a key name, will remove that key from the storage.
   *
   * @param key
   */
  public removeItem(key: string): void {
    delete this.storage[key];
  }

  public load(key: string): any {
    return loadJsonFromStorage(this, key);
  }

  public save(key: string, value: any): any {
    return saveJsonToStorage(this, key, value);
  }
}
