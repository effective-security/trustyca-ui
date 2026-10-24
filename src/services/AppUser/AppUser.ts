import type { RpcMetadata } from '@protobuf-ts/runtime-rpc';
import { IStorage, MemoryStorage } from 'src/libts/browser_storage';
import { isObject } from 'src/libts/is';
import { log } from 'src/libts/logging';
import { normalizeObject } from 'src/libts/objects';
import { Token, UserInfo } from 'src/models/Auth';
import {
  PERSISTED_CSRF_TOKEN_NAME,
  PERSISTED_USER_AUTH_TOKEN,
  PERSISTED_USER_DATA,
  StorageService,
} from 'src/services/storage';
import {
  AppUserListener,
  IAppUser,
  IToken,
  IUserInfo,
  PreferenceScope,
  Preferences,
  SCOPE_ORG,
  SCOPE_PROJECT,
} from 'src/types';

export const COOKIE_TOKEN_TYPE = 'cookie';

const emptyToken: IToken = Token.unauthenticated();
const guest: IUserInfo = UserInfo.unauthenticated();

interface OrgData {
  projectId: string;
}

/** What the console keeps of one user: the project per org and the preferences */
interface UserData {
  perOrg: Record<string, OrgData>;
  user: Preferences;
  org: Record<string, Preferences>;
  project: Record<string, Preferences>;
}

const emptyUserData = (): UserData => ({ perOrg: {}, user: {}, org: {}, project: {} });

interface PersistedUser {
  token: IToken;
  profile: IUserInfo;
}

/**
 * The user state of the console, without a framework: the Angular
 * AuthStore turns its changes into signals through subscribe.
 */
export class AppUser implements IAppUser {
  public token: IToken = emptyToken;
  public profile: IUserInfo = guest;

  /**
   * The data of the signed-in user, kept per user ID: another account
   * signing in on the same browser does not inherit its project selection
   * or its preferences
   */
  private data: UserData = emptyUserData();
  private dataUserId = '';
  private expired = false;
  private readonly listeners = new Set<AppUserListener>();
  private readonly memory = new MemoryStorage();

  constructor(
    private readonly storageService?: StorageService,
    private readonly doc?: Pick<Document, 'cookie'>,
  ) {
    this.loadFromStorage();
  }

  /** The persisted storage of the moment: "Remember me" switches it */
  private get storage(): IStorage {
    return this.storageService?.persisted ?? this.memory;
  }

  get orgId(): string {
    return this.authenticated() ? this.profile.OrgID || '' : '';
  }

  get projectId(): string {
    const orgId = this.orgId;
    return orgId ? this.data.perOrg[orgId]?.projectId || '' : '';
  }

  get isAuthenticated(): boolean {
    return this.authenticated();
  }

  get isCookieSession(): boolean {
    return this.token.TokenType === COOKIE_TOKEN_TYPE;
  }

  get sessionExpired(): boolean {
    return this.expired;
  }

  get csrfToken(): string {
    const name = this.storage.getItem(PERSISTED_CSRF_TOKEN_NAME);
    return name ? this.readCookie(name) : '';
  }

  get isAdmin(): boolean {
    const role = (this.profile.OrgRole || '').toLowerCase();
    return this.isAuthenticated && (role === 'admin' || role === 'owner');
  }

  public logout(expired = false): void {
    this.expired = expired;
    this.storage.removeItem(PERSISTED_USER_AUTH_TOKEN);
    this.storage.removeItem(PERSISTED_CSRF_TOKEN_NAME);
    this.profile = guest;
    this.token = emptyToken;
    this.data = emptyUserData();
    this.dataUserId = '';
    this.notify();
  }

  public setToken(token: IToken, profile: IUserInfo): IAppUser {
    this.token = token;
    this.profile = profile;
    this.expired = false;
    this.loadUserData();
    this.saveToStorage();
    this.notify();
    return this;
  }

  public setProjectId(projectId: string): IAppUser {
    const orgId = this.orgId;
    if (orgId) {
      this.data.perOrg[orgId] = { ...this.data.perOrg[orgId], projectId };
      this.saveUserData();
      this.notify();
    }
    return this;
  }

  public setCsrfTokenName(name: string): void {
    if (name) {
      this.storage.setItem(PERSISTED_CSRF_TOKEN_NAME, name);
    } else {
      this.storage.removeItem(PERSISTED_CSRF_TOKEN_NAME);
    }
  }

  public getCodeChallenge(): Promise<string> {
    if (!this.storageService) {
      return Promise.reject(new Error('AppUser: no storage for the code verifier'));
    }
    return this.storageService.getCodeChallenge();
  }

  public useCodeVerifier(): string {
    return this.storageService?.useCodeVerifier() || '';
  }

  public getPreferences(scope: PreferenceScope): Preferences {
    if (!this.isAuthenticated) {
      return {};
    }
    if (scope === SCOPE_PROJECT) {
      const key = this.orgId + '/' + this.projectId;
      return (this.data.project[key] ??= {});
    }
    if (scope === SCOPE_ORG) {
      return (this.data.org[this.orgId] ??= {});
    }
    return this.data.user;
  }

  public getPreference(scope: PreferenceScope, key: string): string | undefined {
    return this.getPreferences(scope)[key];
  }

  public setPreference(scope: PreferenceScope, key: string, value: string | undefined): IAppUser {
    if (!this.isAuthenticated) {
      return this;
    }
    const prefs = this.getPreferences(scope);
    if (value) {
      prefs[key] = value;
    } else {
      delete prefs[key];
    }
    this.saveUserData();
    this.notify();
    return this;
  }

  public rpcMetadata(meta?: RpcMetadata): RpcMetadata {
    if (!this.authenticated()) {
      return { ...meta };
    }
    if (this.isCookieSession) {
      return { ...meta, 'x-csrf-token': this.csrfToken };
    }
    return {
      ...meta,
      authorization: (this.token.TokenType || 'Bearer') + ' ' + this.token.AccessToken,
    };
  }

  public subscribe(listener: AppUserListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public readCookie(name: string): string {
    const cookies = this.doc?.cookie ?? '';
    const match = cookies
      .split(';')
      .map((row) => row.trim())
      .find((row) => row.startsWith(name + '='));
    return match ? decodeURIComponent(match.substring(name.length + 1)) : '';
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        log.error('AppUser: listener failed', err);
      }
    }
  }

  private loadFromStorage(): void {
    const persisted = this.storage.load(PERSISTED_USER_AUTH_TOKEN) as PersistedUser | undefined;
    if (persisted && isObject(persisted.token) && isObject(persisted.profile)) {
      this.token = Token.clone(persisted.token);
      this.profile = UserInfo.clone({
        ...persisted.profile,
        Orgs: normalizeObject(persisted.profile.Orgs),
      });
      if (!this.authenticated()) {
        this.token = emptyToken;
        this.profile = guest;
        this.storage.removeItem(PERSISTED_USER_AUTH_TOKEN);
      }
    }
    this.loadUserData();

    log.debug(`AppUser: loaded: isAuthenticated=${this.isAuthenticated}, org=${this.orgId}`);
  }

  private saveToStorage(): void {
    if (this.authenticated()) {
      const persisted: PersistedUser = { profile: this.profile, token: this.token };
      this.storage.save(PERSISTED_USER_AUTH_TOKEN, persisted);
      this.saveUserData();
    } else {
      this.storage.removeItem(PERSISTED_USER_AUTH_TOKEN);
    }
  }

  /** The key of the user's data: the user ID, else the email */
  private userKey(): string {
    return this.authenticated() ? this.profile.ID || this.profile.Email : '';
  }

  /** Loads the data of the signed-in user when the user changes */
  private loadUserData(): void {
    const key = this.userKey();
    if (key === this.dataUserId) {
      return;
    }
    const all = (this.storage.load(PERSISTED_USER_DATA) || {}) as Record<string, Partial<UserData>>;
    this.data = { ...emptyUserData(), ...(key ? all[key] : undefined) };
    this.dataUserId = key;
  }

  private saveUserData(): void {
    if (!this.dataUserId) {
      return;
    }
    const all = (this.storage.load(PERSISTED_USER_DATA) || {}) as Record<string, UserData>;
    all[this.dataUserId] = this.data;
    this.storage.save(PERSISTED_USER_DATA, all);
  }

  private authenticated(): boolean {
    const bearer = this.token.TokenType !== COOKIE_TOKEN_TYPE && this.token.AccessToken !== '';
    return (bearer || this.isCookieSession) && !this.token.hasExpired();
  }
}
