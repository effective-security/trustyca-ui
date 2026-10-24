import type { RpcMetadata } from '@protobuf-ts/runtime-rpc';
import { IToken } from './IToken';
import { IUserInfo } from './IUserInfo';

export const SCOPE_USER = 0;
export const SCOPE_ORG = 1;
export const SCOPE_PROJECT = 2;

export type PreferenceScope = typeof SCOPE_USER | typeof SCOPE_ORG | typeof SCOPE_PROJECT;

export type Preferences = Record<string, string>;

export type AppUserListener = (user: IAppUser) => void;

/**
 * Represents the signed-in user: the token, the profile, the project
 * selected per org and the preferences, persisted in the storage that
 * "Remember me" selects
 */
export interface IAppUser {
  readonly profile: IUserInfo;
  readonly token: IToken;

  get orgId(): string;
  /** The project selected in the current org; empty for all projects */
  get projectId(): string;
  get isAuthenticated(): boolean;
  /** True when the token is the HttpOnly cookie of the server */
  get isCookieSession(): boolean;
  get isAdmin(): boolean;
  get csrfToken(): string;
  get sessionExpired(): boolean;

  logout(expired?: boolean): void;

  getCodeChallenge(): Promise<string>;
  useCodeVerifier(): string;

  setToken(token: IToken, profile: IUserInfo): IAppUser;
  setProjectId(projectId: string): IAppUser;
  /** Stores the name of the CSRF cookie of a cookie session */
  setCsrfTokenName(name: string): void;

  getPreferences(scope: PreferenceScope): Preferences;
  getPreference(scope: PreferenceScope, key: string): string | undefined;
  setPreference(scope: PreferenceScope, key: string, value: string | undefined): IAppUser;

  /** The metadata of an rpc: the bearer token, or the CSRF header of a cookie session */
  rpcMetadata(meta?: RpcMetadata): RpcMetadata;

  /**
   * Calls the listener on every change of the user; returns the function
   * that removes it
   */
  subscribe(listener: AppUserListener): () => void;

  readCookie(name: string): string;
}
