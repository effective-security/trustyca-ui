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

  public getItem(key: string): string {
    const value = this.storage.getItem(this.prefix + key);
    // log.debug(`getItem, key=${key}, value=${value}`);
    return value as string;
  }

  public setItem(key: string, value: string): void {
    return this.storage?.setItem(this.prefix + key, value);
  }

  public removeItem(key: string): void {
    return this.storage?.removeItem(this.prefix + key);
  }

  public load(key: string): any {
    return loadJsonFromStorage(this, key);
  }

  public save(key: string, value: any): any {
    return saveJsonToStorage(this, key, value);
  }
}
