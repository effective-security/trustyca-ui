import { PlatformInfo } from 'src/services/AppPlatform/PlatformInfo';
import {
  base64Url,
  pkceChallenge,
  PERSISTED_AFTER_AUTH_ROUTE,
  PERSISTED_DEVICE_ID,
  PERSISTED_OTC_BINDING,
  PERSISTED_USER_AUTH_TOKEN,
  StorageService,
} from './StorageService';

describe('StorageService', () => {
  const platform = new PlatformInfo('test', window);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('encodes base64url without padding', () => {
    expect(base64Url(new Uint8Array([251, 255, 191, 0]))).toBe('-_-_AA');
  });

  it('computes the S256 challenge of RFC 7636', async () => {
    // expected values computed with Python hashlib and base64.urlsafe_b64encode
    expect(await pkceChallenge('trustyca-pkce-verifier', crypto.subtle)).toBe(
      'MrTWibdFcVjiJVeYagZve0XKaih15voosKX-91ICAyM',
    );
    await expect(pkceChallenge('x', undefined)).rejects.toThrow(/Web Crypto/);
  });

  it('keeps the verifier for one use and returns its challenge', async () => {
    const st = new StorageService(platform, 'h_');
    const challenge = await st.getCodeChallenge();
    const verifier = sessionStorage.getItem('h_' + PERSISTED_OTC_BINDING) || '';
    expect(verifier).toHaveLength(64);
    expect(challenge).toBe(await pkceChallenge(verifier, crypto.subtle));
    expect(st.useCodeVerifier()).toBe(verifier);
    expect(st.useCodeVerifier()).toBe('');
  });

  it('creates one device ID per browser', () => {
    const st = new StorageService(platform, 'h_');
    const id = st.getDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem('h_' + PERSISTED_DEVICE_ID)).toBe(id);
    expect(new StorageService(platform, 'h_').getDeviceId()).toBe(id);
  });

  it('switches the persisted storage with remember me and keeps a login in progress in the tab', async () => {
    const st = new StorageService(platform, 'h_');
    expect(st.persisted).toBe(st.session);
    st.setRememberUser(true, 'user1@trustyca.io');
    st.setAfterAuthRoute('/issuers');
    await st.getCodeChallenge();

    expect(st.persisted).toBe(st.local);
    expect(st.getRememberUser()).toBe(true);
    expect(st.getLoginEmail()).toBe('user1@trustyca.io');
    // a login in another tab has a session storage of its own: nothing to overwrite
    expect(sessionStorage.getItem('h_' + PERSISTED_AFTER_AUTH_ROUTE)).toBe('/issuers');
    expect(sessionStorage.getItem('h_' + PERSISTED_OTC_BINDING)).toHaveLength(64);
    expect(localStorage.getItem('h_' + PERSISTED_AFTER_AUTH_ROUTE)).toBeNull();
    expect(localStorage.getItem('h_' + PERSISTED_OTC_BINDING)).toBeNull();
    // a new instance after the redirect reads the same storage
    const reloaded = new StorageService(platform, 'h_');
    expect(reloaded.persisted).toBe(reloaded.local);

    localStorage.setItem('h_' + PERSISTED_USER_AUTH_TOKEN, '{}');
    st.setRememberUser(false, '');
    expect(st.persisted).toBe(st.session);
    expect(st.getRememberUser()).toBe(false);
    expect(st.getLoginEmail()).toBe('');
    expect(localStorage.getItem('h_' + PERSISTED_USER_AUTH_TOKEN)).toBeNull();
    expect(st.useAfterAuthRoute()).toBe('/issuers');
    expect(st.useAfterAuthRoute()).toBe('');
  });

  it('falls back to memory when the browser refuses its storage', () => {
    const refused = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    const blocked = Object.create(window, {
      sessionStorage: { get: refused },
      localStorage: { get: refused },
    }) as Window;
    const st = new StorageService(new PlatformInfo('test', blocked), 'h_');
    expect(st.session.inMemory()).toBe(true);
    expect(st.local.inMemory()).toBe(true);
    st.setAfterAuthRoute('/issuers');
    expect(st.useAfterAuthRoute()).toBe('/issuers');
  });

  it('falls back to memory without a platform', () => {
    const st = new StorageService();
    expect(st.local.inMemory()).toBe(true);
    expect(st.persistedStorageEnabled).toBe(false);
    expect(st.getDeviceId()).toMatch(/^private-/);
  });
});
