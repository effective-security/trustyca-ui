import { BehaviorSubject, Subscription } from 'rxjs';
import { IToken } from './IToken';
import { IUserInfo } from './IUserInfo';

export const SCOPE_USER = 0;
export const SCOPE_ORG = 1;
export const SCOPE_CLOUD = 2;

export type Preferences = Record<string, string>;

/**
 * Represents a user object
 */

export interface IAppUser {
  profile: IUserInfo;
  token: IToken;
  observable: BehaviorSubject<IAppUser>;

  get orgId(): string;
  get isAuthenticated(): boolean;
  get csrfToken(): string;
  get sessionExpired(): boolean;
  get hasDismissedOnboarding(): boolean;

  logout(expired?: boolean): void;

  getCodeChallenge(): string;
  useCodeVerifier(): string;

  setToken(token: IToken, profile: IUserInfo): IAppUser;

  /**
   * Subscribe for changes on AppUserService
   */
  subscribe(next: (value: IAppUser) => void): Subscription;

  readCookie(name: string): string;
}
