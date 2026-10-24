import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CallerScope } from 'src/services/trustyca/protogen/auth';
import { clearStorage, createTestApi, signIn, TestApi } from '../../testing/test-api';
import { AuthStore, EXPIRY_MARGIN_MS } from './auth.store';
import { safeReturnUrl } from './return-url';

describe('AuthStore', () => {
  let api: TestApi;
  let store: AuthStore;

  beforeEach(() => {
    clearStorage();
    api = createTestApi();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'login', children: [] }]), ...api.providers],
    });
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    vi.useRealTimers();
    clearStorage();
  });

  it('follows AppUser in signals', () => {
    expect(store.isAuthenticated()).toBe(false);
    signIn(api.user, 'org1', 'Admin');
    expect(store.isAuthenticated()).toBe(true);
    expect(store.orgId()).toBe('org1');
    expect(store.orgRole()).toBe('Admin');
    expect(store.profile().Email).toBe('user1@trustyca.io');
    api.user.logout(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.sessionExpired()).toBe(true);
  });

  it('answers can() from the caller scope, once per org', async () => {
    signIn(api.user);
    api.auth.scope = CallerScope.create({
      OrgID: 'org1',
      Methods: [
        { Method: '/pb.CA/ListIssuers', AllowedRoles: ['Viewer'], Scopes: [], Allowed: true },
        { Method: '/pb.CA/RegisterIssuer', AllowedRoles: ['Admin'], Scopes: [], Allowed: false },
      ],
    });
    expect(store.can('/pb.CA/ListIssuers')).toBe(false);

    await Promise.all([store.loadSession(), store.loadSession()]);
    expect(api.auth.getCallerScope).toHaveBeenCalledTimes(1);
    expect(store.can('/pb.CA/ListIssuers')).toBe(true);
    expect(store.can('/pb.CA/RegisterIssuer')).toBe(false);
    expect(store.org()?.Name).toBe('Acme');

    signIn(api.user, 'org2');
    expect(store.callerScope()).toBeUndefined();
    expect(store.can('/pb.CA/ListIssuers')).toBe(false);
    await store.loadSession();
    expect(api.auth.getCallerScope).toHaveBeenCalledTimes(2);
  });

  it('drops the scope of a session that ended, even for the same org', async () => {
    let answerOld!: (s: CallerScope) => void;
    api.auth.getCallerScope.mockImplementationOnce(
      () => new Promise<CallerScope>((resolve) => (answerOld = resolve)),
    );
    signIn(api.user);
    const old = store.loadSession();

    api.user.logout();
    signIn(api.user);
    api.auth.scope = CallerScope.create({ OrgID: 'org1', Methods: [] });
    await store.loadSession();

    answerOld(
      CallerScope.create({
        OrgID: 'org1',
        Methods: [{ Method: '/pb.CA/ListIssuers', AllowedRoles: [], Scopes: [], Allowed: true }],
      }),
    );
    await old;
    expect(store.can('/pb.CA/ListIssuers')).toBe(false);
  });

  it('loads the scope again after a failure', async () => {
    signIn(api.user);
    api.auth.getCallerScope.mockRejectedValueOnce(new Error('offline'));
    await expect(store.loadSession()).rejects.toThrow('offline');
    await store.loadSession();
    expect(api.auth.getCallerScope).toHaveBeenCalledTimes(2);
  });

  it('completes the session without the org name when GetOrg fails', async () => {
    signIn(api.user);
    api.orgs.getOrg.mockRejectedValueOnce(new Error('denied'));
    await store.loadSession();
    expect(store.callerScope()).toBeDefined();
    expect(store.org()).toBeUndefined();
  });

  it('routes a completed sign-in to the stored page, once', async () => {
    signIn(api.user);
    api.storage.setAfterAuthRoute('/certificates?status=active');
    expect(await store.completeSignIn()).toBe('/certificates?status=active');
    expect(await store.completeSignIn()).toBe('/dashboard');
  });

  it('signs out with the revoke and opens the login', async () => {
    signIn(api.user);
    await store.signOut();
    expect(api.auth.revokeToken).toHaveBeenCalledTimes(1);
    expect(api.user.isAuthenticated).toBe(false);
    expect(api.user.sessionExpired).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('does not revoke without a session', async () => {
    await store.signOut();
    expect(api.auth.revokeToken).not.toHaveBeenCalled();
  });

  it('expires the session a minute before the token does', () => {
    vi.useFakeTimers();
    signIn(api.user, 'org1', 'Owner', EXPIRY_MARGIN_MS + 5_000);
    vi.advanceTimersByTime(4_000);
    expect(store.isAuthenticated()).toBe(true);
    vi.advanceTimersByTime(2_000);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.sessionExpired()).toBe(true);
  });
});

describe('safeReturnUrl', () => {
  it('keeps the pages of the console only', () => {
    expect(safeReturnUrl('/issuers?status=1#x')).toBe('/issuers?status=1#x');
    expect(safeReturnUrl('https://example.com')).toBe('');
    expect(safeReturnUrl('//example.com')).toBe('');
    expect(safeReturnUrl('/\\example.com')).toBe('');
    expect(safeReturnUrl('/login?returnUrl=/x')).toBe('');
    expect(safeReturnUrl('/auth/authenticated?code=1')).toBe('');
    expect(safeReturnUrl(null)).toBe('');
  });
});
