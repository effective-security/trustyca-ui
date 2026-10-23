import { BrowserStorage } from './BrowserStorage';
import { IStorage } from './IStorage';
import { MemoryStorage } from './MemoryStorage';

export class Storage {
  public memory: IStorage;
  public session: IStorage;
  public local: IStorage;
  public persisted: IStorage;

  public readonly persistedStorageDisabled: boolean;
  public readonly persistedStorageEnabled: boolean;

  constructor(private $window: any = window) {
    this.memory = new MemoryStorage();
    this.session = new BrowserStorage($window.sessionStorage || this.memory);
    this.local = new BrowserStorage($window.localStorage || this.memory);

    this.persistedStorageDisabled = this.local.inMemory();
    this.persistedStorageEnabled = !this.persistedStorageDisabled;

    this.persisted = this.persistedStorageDisabled ? this.session : this.local;
  }
}
