import { BrowserStorage, IStorage, MemoryStorage } from 'src/libts/browser_storage';
import { log } from 'src/libts/logging';
import { createUUID, randomString } from 'src/libts/strings';
import { IPlatformInfo } from 'src/types';

export const PERSISTED_USER_AUTH_TOKEN = 'trustyca_user';
export const PERSISTED_DEVICE_ID = 'trustyca_device_id';
/** The project selection and the preferences, per user ID */
export const PERSISTED_USER_DATA = 'trustyca_user_data';
export const PERSISTED_OTC_BINDING = 'otc_binding';
export const PERSISTED_AFTER_AUTH_ROUTE = 'after_auth_route';
export const PERSISTED_REMEMBER_USER = 'remember_user';
export const PERSISTED_LOGIN_EMAIL = 'login_email';
export const PERSISTED_CSRF_TOKEN_NAME = 'csrf_token_name';

/**
 * Encodes bytes as base64url without padding (RFC 4648 section 5), the
 * encoding of a PKCE S256 code challenge (RFC 7636 section 4.2)
 */
export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Returns the PKCE S256 code challenge of a verifier:
 * BASE64URL(SHA256(ASCII(verifier))) (RFC 7636 section 4.2)
 */
export async function pkceChallenge(
  verifier: string,
  subtle: SubtleCrypto | undefined,
): Promise<string> {
  if (!subtle) {
    throw new Error(
      'Web Crypto is not available: the console must be served over https or from localhost',
    );
  }
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/**
 * Returns a storage of the window, or undefined when the browser refuses
 * it: reading `window.localStorage` itself throws SecurityError when site
 * data is blocked
 */
function windowStorage(get: () => Storage): Storage | undefined {
  try {
    return get();
  } catch (e) {
    log.error('StorageService: browser storage is not available', e);
    return undefined;
  }
}

/**
 * Memory, session and local storage with a per-host prefix, and the
 * `persisted` storage that "Remember me" selects: local storage when the
 * user asked to be remembered, else session storage. The values of a login
 * in progress (the PKCE verifier, the after-auth route) always live in the
 * session storage of the tab, which survives the redirect to the identity
 * provider and is not shared with a login in another tab.
 */
export class StorageService {
  public readonly memory: IStorage;
  public readonly session: IStorage;
  public readonly local: IStorage;
  public persisted: IStorage;

  constructor(
    private readonly platform?: IPlatformInfo,
    prefix?: string,
  ) {
    this.memory = new MemoryStorage();

    if (platform) {
      const win = platform.window;
      this.session = new BrowserStorage(
        windowStorage(() => win.sessionStorage),
        prefix,
      );
      this.local = new BrowserStorage(
        windowStorage(() => win.localStorage),
        prefix,
      );
    } else {
      this.session = this.memory;
      this.local = this.memory;
    }

    this.persisted = this.persistedStorageEnabled ? this.local : this.session;

    log.debug(`StorageService, persisted=${this.persistedStorageEnabled}, prefix=${prefix}`);
  }

  /** True when the user asked to be remembered and local storage works */
  get persistedStorageEnabled(): boolean {
    return !this.local.inMemory() && this.getRememberUser();
  }

  public getDeviceId(): string {
    let deviceID = this.local.getItem(PERSISTED_DEVICE_ID);
    if (!deviceID || typeof deviceID !== 'string' || deviceID.length !== 36) {
      // create new ID for this browser
      deviceID = createUUID();
      this.local.setItem(PERSISTED_DEVICE_ID, deviceID);
    }

    if (this.local.inMemory()) {
      deviceID = 'private-' + deviceID;
    }

    return deviceID;
  }

  /**
   * Creates and stores a PKCE code verifier, and returns its S256 code
   * challenge. The verifier survives the redirect to the identity provider
   * in the session storage of the tab, and useCodeVerifier takes it once.
   */
  public async getCodeChallenge(): Promise<string> {
    const codeVerifier = randomString(64);
    this.session.setItem(PERSISTED_OTC_BINDING, codeVerifier);
    return pkceChallenge(
      codeVerifier,
      this.platform?.window.crypto?.subtle ?? globalThis.crypto?.subtle,
    );
  }

  public useCodeVerifier(): string {
    const value = this.session.getItem(PERSISTED_OTC_BINDING) || '';
    this.session.removeItem(PERSISTED_OTC_BINDING);
    return value;
  }

  public setAfterAuthRoute(route: string): void {
    log.debug(`StorageService: setAfterAuthRoute=${route}`);
    this.session.setItem(PERSISTED_AFTER_AUTH_ROUTE, route);
  }

  public useAfterAuthRoute(): string {
    const route = this.session.getItem(PERSISTED_AFTER_AUTH_ROUTE) || '';
    if (route) {
      this.session.removeItem(PERSISTED_AFTER_AUTH_ROUTE);
      log.debug(`StorageService: useAfterAuthRoute=${route}`);
    }
    return route;
  }

  /**
   * Remembers the choice of the login page: with rememberUser the token
   * and the login email live in local storage, else in session storage,
   * and nothing of the user is left in local storage.
   */
  public setRememberUser(rememberUser: boolean, email: string): void {
    if (rememberUser && !this.local.inMemory()) {
      this.persisted = this.local;
      this.local.setItem(PERSISTED_REMEMBER_USER, 'true');
      if (email) {
        this.local.setItem(PERSISTED_LOGIN_EMAIL, email);
      } else {
        this.local.removeItem(PERSISTED_LOGIN_EMAIL);
      }
    } else {
      this.persisted = this.session;
      this.local.removeItem(PERSISTED_REMEMBER_USER);
      this.local.removeItem(PERSISTED_LOGIN_EMAIL);
      this.local.removeItem(PERSISTED_USER_AUTH_TOKEN);
      this.local.removeItem(PERSISTED_USER_DATA);
      this.local.removeItem(PERSISTED_CSRF_TOKEN_NAME);
    }
  }

  public getRememberUser(): boolean {
    return this.local.getItem(PERSISTED_REMEMBER_USER) === 'true';
  }

  public getLoginEmail(): string {
    return this.local.getItem(PERSISTED_LOGIN_EMAIL) || '';
  }
}
