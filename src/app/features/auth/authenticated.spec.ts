import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { PERSISTED_CSRF_TOKEN_NAME } from 'src/services/storage';
import { Role_Enum } from 'src/services/trustyca/protogen/orgs';
import { routes } from '../../app.routes';
import { clearStorage, createTestApi, TEST_PREFIX, TestApi } from '../../testing/test-api';

describe('Authenticated landing', () => {
  let api: TestApi;

  beforeEach(() => {
    clearStorage();
    api = createTestApi();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), ...api.providers] });
  });

  afterEach(() => clearStorage());

  const land = async (path: string) => {
    const harness = await RouterTestingHarness.create(path);
    await harness.fixture.whenStable();
    return harness;
  };
  const url = () => TestBed.inject(Router).url;

  it('exchanges the code, loads the profile and opens the page requested before the sign-in', async () => {
    api.storage.setAfterAuthRoute('/issuers');
    await land('/auth/authenticated?code=otc-1&expires_in=30');

    expect(api.platform.replaceHistoryUrl).toHaveBeenCalledWith('/auth/authenticated');
    expect(api.auth.exchangeCode).toHaveBeenCalledWith('otc-1');
    expect(api.auth.getUserToken).toHaveBeenCalledWith('jwt-otc-1');
    expect(api.auth.getCallerScope).toHaveBeenCalled();
    expect(api.user.isAuthenticated).toBe(true);
    expect(url()).toBe('/issuers');
  });

  it('cleans the address bar before any call', async () => {
    let cleanedFirst = false;
    api.auth.exchangeCode.mockImplementationOnce(async () => {
      cleanedFirst = api.platform.replaceHistoryUrl.mock.calls.length > 0;
      throw new RpcError('invalid otc', 'PERMISSION_DENIED');
    });
    await land('/auth/authenticated?code=otc-2');
    expect(cleanedFirst).toBe(true);
  });

  it('reads the cookie session with the CSRF cookie name of the landing', async () => {
    await land(
      '/auth/authenticated?cookie_set=true&csrf=avn_trustyca_csrf_token&expires_in=172800',
    );

    expect(sessionStorage.getItem(TEST_PREFIX + PERSISTED_CSRF_TOKEN_NAME)).toBe(
      'avn_trustyca_csrf_token',
    );
    expect(api.auth.getUserToken).toHaveBeenCalledWith();
    expect(api.auth.exchangeCode).not.toHaveBeenCalled();
    expect(url()).toBe('/dashboard');
  });

  it('takes the result of the fragment response mode', async () => {
    await land('/auth/authenticated#code=otc-3&expires_in=30');
    expect(api.auth.exchangeCode).toHaveBeenCalledWith('otc-3');
    expect(url()).toBe('/dashboard');
  });

  it('returns to the login with the error of the server', async () => {
    await land('/auth/authenticated?error=access_denied&error_description=email%20mismatch');
    expect(api.auth.exchangeCode).not.toHaveBeenCalled();
    expect(url()).toBe('/login?error=access_denied&error_description=email%20mismatch');
  });

  it('returns to the login with the reason of a failed exchange and forgets the user', async () => {
    api.auth.exchangeCode.mockRejectedValueOnce(new RpcError('invalid otc', 'PERMISSION_DENIED'));
    const harness = await land('/auth/authenticated?code=stale');
    expect(url()).toBe('/login?error=access_denied&error_description=invalid%20otc');
    expect(api.user.isAuthenticated).toBe(false);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.notice')?.textContent).toContain(
      'invalid otc',
    );
  });

  it('reports a server failure as server_error', async () => {
    api.auth.getCallerScope.mockRejectedValueOnce(new RpcError('backend down', 'UNAVAILABLE'));
    await land('/auth/authenticated?code=otc-4');
    expect(url()).toBe('/login?error=server_error&error_description=backend%20down');
    expect(api.user.isAuthenticated).toBe(false);
  });

  it('opens the login without a result', async () => {
    await land('/auth/authenticated');
    expect(url()).toBe('/login');
  });

  it('sends a user without an org to the no-org notice', async () => {
    api.auth.loginOrgId = '';
    api.orgs.orgs = [];
    await land('/auth/authenticated?code=otc-5');
    expect(url()).toBe('/auth/noorg');
  });

  it('sends a user without a role in the org to the no-role notice', async () => {
    api.auth.scope = { ...api.auth.scope, Role: Role_Enum.None, ProjectRoles: {} };
    await land('/auth/authenticated?code=otc-6');
    expect(url()).toBe('/auth/norole');
  });

  it('lets a project member in', async () => {
    api.auth.scope = { ...api.auth.scope, Role: Role_Enum.None, ProjectRoles: { p1: 'User' } };
    await land('/auth/authenticated?code=otc-7');
    expect(url()).toBe('/dashboard');
  });
});
