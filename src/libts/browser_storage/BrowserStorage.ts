import { log } from '../logging';
import { IStorage } from './IStorage';
import { MemoryStorage } from './MemoryStorage';
import { loadJsonFromStorage } from './loadJsonFromStorage';
import { saveJsonToStorage } from './saveJsonToStorage';

export class BrowserStorage implements IStorage {
  public storage: IStorage | Storage;

  constructor(
    public storageIn: IStorage | Storage | undefined,
    private prefix?: string,
  ) {
    this.prefix = prefix || '';

    if (storageIn) {
      const testKey = '$$test';
      try {
        const testVal = '_' + Date.now();

        storageIn.setItem(testKey, testVal);
        if (testVal !== storageIn.getItem(testKey)) {
          storageIn = undefined;
          log.error('api=BrowserStorage, reason=not_supported');
        } else {
          storageIn.removeItem(testKey);
        }
      } catch (e: any) {
        storageIn = undefined;
        log.error('api=BrowserStorage, error=' + e.toString());
      }
    }

    this.storage = storageIn !== undefined ? storageIn : new MemoryStorage();
  }

  public inMemory(): boolean {
    return this.storage instanceof MemoryStorage;
  }

  public clear(): void {
    this.storage?.clear();
  }

  // the browser may refuse storage after the test write (blocked site
  // data, a full quota): a failed read is a missing value, a failed write
  // is logged, and neither fails the caller

  public getItem(key: string): string {
    try {
      return this.storage.getItem(this.prefix + key) as string;
    } catch (e: any) {
      log.error('api=BrowserStorage.getItem, error=' + e.toString());
      return null as unknown as string;
    }
  }

  public setItem(key: string, value: string): void {
    try {
      this.storage.setItem(this.prefix + key, value);
    } catch (e: any) {
      log.error('api=BrowserStorage.setItem, error=' + e.toString());
    }
  }

  public removeItem(key: string): void {
    try {
      this.storage.removeItem(this.prefix + key);
    } catch (e: any) {
      log.error('api=BrowserStorage.removeItem, error=' + e.toString());
    }
  }

  public load(key: string): any {
    return loadJsonFromStorage(this, key);
  }

  public save(key: string, value: any): any {
    return saveJsonToStorage(this, key, value);
  }
}
