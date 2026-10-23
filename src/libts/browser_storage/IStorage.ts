/**
 *  Abstracts the browser local storage
 */
export interface IStorage {
  /**
   * Returns true, if the storage is in memory, and not persisted.
   */
  inMemory(): boolean;

  /**
   * Will empty all keys out of the storage.
   */
  clear(): void;

  /**
   * When passed a key name, will return that key's value.
   *
   * @param key
   * @returns {*}
   */
  getItem(key: string): string;

  /**
   * When passed a key name and value, will add that key to the storage, or update that key's value if it already exists.
   *
   * @param key
   * @param obj
   * @returns {*}
   */
  setItem(key: string, value: string): void;

  /**
   * When passed a key name, will remove that key from the storage.
   *
   * @param key
   */
  removeItem(key: string): void;

  /**
   * Load an object from the storage
   *
   * @param key
   */
  load(key: string): any;

  /**
   * Save an object to the storage
   *
   * @param key
   * @param obj
   */
  save(key: string, obj: any): any;
}
