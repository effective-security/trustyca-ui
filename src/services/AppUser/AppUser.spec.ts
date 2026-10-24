import { Token, UserInfo } from 'src/models/Auth';
import { PlatformInfo } from 'src/services/AppPlatform/PlatformInfo';
import {
  PERSISTED_CSRF_TOKEN_NAME,
  PERSISTED_USER_AUTH_TOKEN,
  StorageService,
} from 'src/services/storage';
import { SCOPE_ORG, SCOPE_PROJECT, SCOPE_USER } from 'src/types';
import { AppUser, COOKIE_TOKEN_TYPE } from './AppUser';

const inAnHour = () => new Date(Date.now() + 3600_000);
const profile = (orgId = 'org1', role = 'Admin') =>
  new UserInfo(
    '42',
    'User One',
    'user1@trustyca.io',
    true,
    { org1: 'Admin', org2: 'Viewer' },
    orgId,
    role,
  );

describe('AppUser', () => {
  const platform = new PlatformInfo('test', window);
  let storage: StorageService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storage = new StorageService(platform, 'h_');
  });

  it('starts as a guest', () => {
    const user = new AppUser(storage);
    expect(user.isAuthenticated).toBe(false);
    expect(user.orgId).toBe('');
    expect(user.rpcMetadata({ a: 'b' })).toEqual({ a: 'b' });
  });

  it('stores a bearer token in the session and restores it after a reload', () => {
    const user = new AppUser(storage);
    const seen: boolean[] = [];
    const unsubscribe = user.subscribe((u) => seen.push(u.isAuthenticated));
    user.setToken(new Token('jwt', 'Bearer', inAnHour()), profile());

    expect(user.isAuthenticated).toBe(true);
    expect(user.orgId).toBe('org1');
    expect(user.isAdmin).toBe(true);
    expect(user.rpcMetadata()).toEqual({ authorization: 'Bearer jwt' });
    expect(sessionStorage.getItem('h_' + PERSISTED_USER_AUTH_TOKEN)).toContain('jwt');
    expect(localStorage.getItem('h_' + PERSISTED_USER_AUTH_TOKEN)).toBeNull();
    expect(seen).toEqual([true]);

    const reloaded = new AppUser(new StorageService(platform, 'h_'));
    expect(reloaded.isAuthenticated).toBe(true);
    expect(reloaded.profile.Email).toBe('user1@trustyca.io');
    expect(reloaded.token.ExpiresAt).toBeInstanceOf(Date);

    unsubscribe();
    user.logout();
    expect(seen).toEqual([true]);
  });

  it('remembers the user in local storage', () => {
    storage.setRememberUser(true, 'user1@trustyca.io');
    new AppUser(storage).setToken(new Token('jwt', 'Bearer', inAnHour()), profile());
    expect(localStorage.getItem('h_' + PERSISTED_USER_AUTH_TOKEN)).toContain('jwt');
  });

  it('drops an expired token on load', () => {
    sessionStorage.setItem(
      'h_' + PERSISTED_USER_AUTH_TOKEN,
      JSON.stringify({
        token: new Token('jwt', 'Bearer', new Date(Date.now() - 1000)),
        profile: profile(),
      }),
    );
    const user = new AppUser(storage);
    expect(user.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem('h_' + PERSISTED_USER_AUTH_TOKEN)).toBeNull();
  });

  it('sends the CSRF cookie of a cookie session', () => {
    const user = new AppUser(storage, { cookie: 'other=1; avn_trustyca_csrf_token=abc%3D; x=2' });
    user.setCsrfTokenName('avn_trustyca_csrf_token');
    user.setToken(new Token('', COOKIE_TOKEN_TYPE, inAnHour()), profile());

    expect(user.isAuthenticated).toBe(true);
    expect(user.isCookieSession).toBe(true);
    expect(user.csrfToken).toBe('abc=');
    expect(user.rpcMetadata()).toEqual({ 'x-csrf-token': 'abc=' });

    user.logout();
    expect(sessionStorage.getItem('h_' + PERSISTED_CSRF_TOKEN_NAME)).toBeNull();
  });

  it('flags an expired session on logout', () => {
    const user = new AppUser(storage);
    user.setToken(new Token('jwt', 'Bearer', inAnHour()), profile());
    user.logout(true);
    expect(user.isAuthenticated).toBe(false);
    expect(user.sessionExpired).toBe(true);
    expect(sessionStorage.getItem('h_' + PERSISTED_USER_AUTH_TOKEN)).toBeNull();

    user.setToken(new Token('jwt', 'Bearer', inAnHour()), profile());
    expect(user.sessionExpired).toBe(false);
  });

  it('keeps the project selection per org', () => {
    const user = new AppUser(storage);
    user.setToken(new Token('jwt', 'Bearer', inAnHour()), profile('org1'));
    user.setProjectId('p1');
    expect(user.projectId).toBe('p1');

    user.setToken(new Token('jwt2', 'Bearer', inAnHour()), profile('org2', 'Viewer'));
    expect(user.projectId).toBe('');
    expect(user.isAdmin).toBe(false);

    user.setToken(new Token('jwt3', 'Bearer', inAnHour()), profile('org1'));
    expect(user.projectId).toBe('p1');
    expect(new AppUser(new StorageService(platform, 'h_')).projectId).toBe('p1');
  });

  it('scopes preferences to the user, the org and the project', () => {
    const user = new AppUser(storage);
    user.setPreference(SCOPE_USER, 'pageSize', '50');
    expect(user.getPreference(SCOPE_USER, 'pageSize')).toBeUndefined();

    user.setToken(new Token('jwt', 'Bearer', inAnHour()), profile('org1'));
    user.setPreference(SCOPE_USER, 'pageSize', '50');
    user.setPreference(SCOPE_ORG, 'dateFormat', 'iso');
    user.setProjectId('p1');
    user.setPreference(SCOPE_PROJECT, 'view', 'table');

    user.setToken(new Token('jwt2', 'Bearer', inAnHour()), profile('org2'));
    expect(user.getPreference(SCOPE_USER, 'pageSize')).toBe('50');
    expect(user.getPreference(SCOPE_ORG, 'dateFormat')).toBeUndefined();
    expect(user.getPreference(SCOPE_PROJECT, 'view')).toBeUndefined();

    const reloaded = new AppUser(new StorageService(platform, 'h_'));
    expect(reloaded.getPreference(SCOPE_USER, 'pageSize')).toBe('50');
    reloaded.setToken(new Token('jwt', 'Bearer', inAnHour()), profile('org1'));
    expect(reloaded.getPreference(SCOPE_ORG, 'dateFormat')).toBe('iso');
    expect(reloaded.getPreference(SCOPE_PROJECT, 'view')).toBe('table');
    reloaded.setPreference(SCOPE_ORG, 'dateFormat', undefined);
    expect(reloaded.getPreference(SCOPE_ORG, 'dateFormat')).toBeUndefined();
  });

  it('keeps the data of each user apart, and drops it from memory on sign-out', () => {
    const user = new AppUser(storage);
    user.setToken(new Token('jwt', 'Bearer', inAnHour()), profile('org1'));
    user.setProjectId('p1');
    user.setPreference(SCOPE_USER, 'pageSize', '50');
    user.logout();
    expect(user.getPreference(SCOPE_USER, 'pageSize')).toBeUndefined();

    // another account in the same org inherits nothing
    user.setToken(
      new Token('jwt-b', 'Bearer', inAnHour()),
      new UserInfo('77', 'User Two', 'user2@trustyca.io', true, {}, 'org1', 'Viewer'),
    );
    expect(user.projectId).toBe('');
    expect(user.getPreference(SCOPE_USER, 'pageSize')).toBeUndefined();
    user.setProjectId('p2');
    user.logout();

    // the first account finds its own again
    user.setToken(new Token('jwt', 'Bearer', inAnHour()), profile('org1'));
    expect(user.projectId).toBe('p1');
    expect(user.getPreference(SCOPE_USER, 'pageSize')).toBe('50');
  });

  it('reports a listener failure without breaking the others', () => {
    const user = new AppUser(storage);
    const second = vi.fn();
    user.subscribe(() => {
      throw new Error('boom');
    });
    user.subscribe(second);
    user.logout();
    expect(second).toHaveBeenCalledWith(user);
  });
});
