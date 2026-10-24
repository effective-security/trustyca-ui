import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { AuthProvidersResponse } from 'src/services/trustyca/protogen/auth';
import { routes } from '../../app.routes';
import { clearStorage, createTestApi, TestApi } from '../../testing/test-api';

describe('Login', () => {
  let api: TestApi;

  beforeEach(() => {
    clearStorage();
    api = createTestApi();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), ...api.providers] });
  });

  afterEach(() => clearStorage());

  const open = async (path = '/login') => {
    const harness = await RouterTestingHarness.create(path);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  };
  const el = (h: RouterTestingHarness) => h.routeNativeElement as HTMLElement;
  const typeEmail = (h: RouterTestingHarness, value: string) => {
    const input = el(h).querySelector<HTMLInputElement>('input[type="email"]');
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  };

  it('offers the providers of the server', async () => {
    const h = await open();
    const names = Array.from(el(h).querySelectorAll('.provider-button')).map((b) =>
      b.textContent?.trim(),
    );
    expect(names).toEqual(['Continue with GitHub', 'Continue with a local account']);
  });

  it('finds the provider of an email domain and signs in as that address, remembered', async () => {
    api.auth.getProviders.mockImplementation(async (email?: string) =>
      AuthProvidersResponse.create({ ProviderNames: email ? ['google'] : ['github', 'google'] }),
    );
    const h = await open();
    typeEmail(h, 'user1@acme.com');
    el(h).querySelector<HTMLInputElement>('mat-checkbox input')?.click();
    el(h).querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await h.fixture.whenStable();

    expect(api.auth.getProviders).toHaveBeenCalledWith('user1@acme.com');
    expect(api.auth.authorizeUrl).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google', email: 'user1@acme.com', rememberMe: true }),
    );
    expect(api.storage.getRememberUser()).toBe(true);
    expect(api.storage.getLoginEmail()).toBe('user1@acme.com');
    expect(api.platform.redirect).toHaveBeenCalled();
  });

  it('signs in the typed address with the local provider', async () => {
    const h = await open();
    typeEmail(h, 'local+user2@trustyca.io');
    el(h).querySelector<HTMLButtonElement>('[data-provider="local"]')?.click();
    await h.fixture.whenStable();
    expect(api.auth.authorizeUrl).toHaveBeenLastCalledWith(
      expect.objectContaining({ provider: 'local', email: 'local+user2@trustyca.io' }),
    );
  });

  it('only hints the typed address to the other providers', async () => {
    const h = await open();
    typeEmail(h, 'local+user2@trustyca.io');
    el(h).querySelector<HTMLButtonElement>('[data-provider="github"]')?.click();
    await h.fixture.whenStable();
    expect(api.auth.authorizeUrl).toHaveBeenLastCalledWith(
      expect.objectContaining({
        provider: 'github',
        email: undefined,
        loginHint: 'local+user2@trustyca.io',
      }),
    );
  });

  it('asks for an email before the email flow and shows a refused domain', async () => {
    const h = await open();
    el(h).querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await h.fixture.whenStable();
    h.detectChanges();
    expect(el(h).querySelector('.notice')?.textContent).toContain('Enter your email address');
    expect(api.auth.getProviders).toHaveBeenCalledTimes(1);

    api.auth.getProviders.mockRejectedValueOnce(
      new RpcError('login is restricted to invited users only', 'PERMISSION_DENIED'),
    );
    typeEmail(h, 'someone@else.com');
    el(h).querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await h.fixture.whenStable();
    h.detectChanges();
    expect(el(h).querySelector('.notice')?.textContent).toContain('restricted to invited users');
    expect(api.platform.redirect).not.toHaveBeenCalled();
  });

  it('shows the error the sign-in landed with', async () => {
    const h = await open('/login?error=temporarily_unavailable');
    expect(el(h).querySelector('.notice.error')?.textContent).toContain('temporarily unavailable');
  });

  it('offers a retry when the providers cannot be loaded', async () => {
    api.auth.getProviders.mockRejectedValueOnce(new RpcError('down', 'UNAVAILABLE'));
    const h = await open();
    expect(el(h).querySelector('.notice.error')?.textContent).toContain('could not be loaded');
    el(h).querySelector<HTMLButtonElement>('.notice.error button')?.click();
    await h.fixture.whenStable();
    h.detectChanges();
    expect(el(h).querySelectorAll('.provider-button')).toHaveLength(2);
  });
});
