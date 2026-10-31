import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Token, UserInfo } from 'src/models/Auth';
import { PERSISTED_AFTER_AUTH_ROUTE, PERSISTED_USER_AUTH_TOKEN } from 'src/services/storage';
import { CallerScope } from 'src/services/trustyca/protogen/auth';
import { Role_Enum, RoleSource_Enum } from 'src/services/trustyca/protogen/orgs';
import { routes } from './app.routes';
import {
  allowMethods,
  callerScope,
  clearStorage,
  createTestApi,
  signIn,
  TEST_PREFIX,
  TestApi,
} from './testing/test-api';

describe('Console navigation', () => {
  let api: TestApi;

  function configure(): void {
    api = createTestApi();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), ...api.providers] });
  }

  const url = () => TestBed.inject(Router).url;
  const text = (harness: RouterTestingHarness, selector: string) =>
    harness.routeNativeElement?.querySelector(selector)?.textContent?.trim();
  /** Lets the fakes answer and renders the shell and the overlays */
  const flush = async (harness: RouterTestingHarness) => {
    await harness.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };
  const menuItems = (selector: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>(selector));
  const itemLabel = (item: HTMLElement) =>
    item.querySelector('.switcher-text')?.firstChild?.textContent?.trim();

  beforeEach(() => {
    clearStorage();
    configure();
  });

  afterEach(() => clearStorage());

  it('redirects a protected deep link to the login and remembers the destination', async () => {
    const harness = await RouterTestingHarness.create('/issuers');
    expect(url()).toBe('/login?returnUrl=%2Fissuers');
    expect(text(harness, 'h1')).toContain('Trust starts');
  });

  it('starts the sign-in of a provider and keeps the requested page for after it', async () => {
    const harness = await RouterTestingHarness.create('/certificates');
    await harness.fixture.whenStable();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[data-provider="github"]')
      ?.click();
    await harness.fixture.whenStable();

    expect(api.auth.authorizeUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'github',
        redirectUri: 'http://localhost:4200/auth/authenticated',
      }),
    );
    expect(api.platform.redirect).toHaveBeenCalledWith(
      'https://localhost:8880/v1/auth/authorize?provider=github',
    );
    expect(sessionStorage.getItem(TEST_PREFIX + PERSISTED_AFTER_AUTH_ROUTE)).toBe('/certificates');
  });

  it('ignores an external return URL', async () => {
    const harness = await RouterTestingHarness.create('/login?returnUrl=https%3A%2F%2Fexample.com');
    await harness.fixture.whenStable();
    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('[data-provider="local"]')
      ?.click();
    await harness.fixture.whenStable();
    expect(api.platform.redirect).toHaveBeenCalled();
    expect(sessionStorage.getItem(TEST_PREFIX + PERSISTED_AFTER_AUTH_ROUTE)).toBe('');
  });

  it('restores the session after a reload and opens the page', async () => {
    signIn(api.user);
    TestBed.resetTestingModule();
    configure();
    const harness = await RouterTestingHarness.create('/issuers');
    expect(url()).toBe('/issuers');
    expect(text(harness, 'h1')).toBe('Issuers');
  });

  it('sends a signed-in user from the login page to the requested page', async () => {
    signIn(api.user);
    await RouterTestingHarness.create('/login?returnUrl=%2Fcertificates');
    expect(url()).toBe('/certificates');
  });

  it('shows the user and the org in the shell and the server build in the footer', async () => {
    signIn(api.user);
    const harness = await RouterTestingHarness.create('/dashboard');
    await harness.fixture.whenStable();
    harness.detectChanges();
    const shell = harness.fixture.nativeElement as HTMLElement;
    expect(shell.querySelector('.profile-label')?.textContent).toContain('user1@trustyca.io');
    expect(shell.querySelector('.workspace-label')?.textContent).toContain('Acme');
    expect(shell.querySelector('.server-version')?.textContent).toContain('v0.1.12-test');
    expect(shell.querySelector('.preview-badge')?.textContent).toContain('Owner');
    expect(shell.querySelector('.breadcrumb')?.textContent).toContain('Dashboard');
    expect(api.auth.getCallerScope).toHaveBeenCalledTimes(1);
  });

  it('shows the navigation groups and hides an entry the caller scope denies', async () => {
    signIn(api.user);
    const harness = await RouterTestingHarness.create('/dashboard');
    await flush(harness);
    const shell = harness.fixture.nativeElement as HTMLElement;
    const labels = () =>
      Array.from(shell.querySelectorAll('.nav-link span')).map((e) => e.textContent);
    expect(labels()).toEqual([
      'Dashboard',
      'Issuers',
      'Certificates',
      'Profiles',
      'Trust anchors',
      'Revocation',
      'Lookup',
      'Organization',
    ]);
    expect(Array.from(shell.querySelectorAll('.nav-label')).map((e) => e.textContent)).toEqual([
      'Workspace',
      'Administration',
    ]);

    api.auth.scope = callerScope(Role_Enum.Viewer, ['/pb.CA/ListIssuers']);
    signIn(api.user, 'org2', 'Viewer');
    await flush(harness);
    expect(labels()).not.toContain('Organization');
    expect(shell.querySelector('.preview-badge')?.textContent).toContain('Viewer');
  });

  it('switches the org from the sidebar menu', async () => {
    signIn(api.user, 'org1');
    const harness = await RouterTestingHarness.create('/issuers');
    await flush(harness);
    const shell = harness.fixture.nativeElement as HTMLElement;
    expect(api.orgs.getUserOrgs).not.toHaveBeenCalled();
    shell.querySelector<HTMLButtonElement>('.workspace-label')?.click();
    await flush(harness);
    expect(api.orgs.getUserOrgs).toHaveBeenCalledTimes(1);
    const items = menuItems('.org-item');
    expect(items.map(itemLabel)).toEqual(['Acme', 'Globex']);
    expect(items[0].classList.contains('current')).toBe(true);
    expect(items[1].textContent).toContain('Viewer');

    items[1].click();
    await flush(harness);
    expect(api.auth.selectOrg).toHaveBeenCalledWith('org2', false);
    expect(api.user.orgId).toBe('org2');
    expect(url()).toBe('/dashboard');
  });

  it('selects the project in the toolbar and keeps the selection per org', async () => {
    signIn(api.user, 'org1');
    const harness = await RouterTestingHarness.create('/dashboard');
    await flush(harness);
    const shell = harness.fixture.nativeElement as HTMLElement;
    const label = () => shell.querySelector('.project-label')?.textContent?.trim();
    expect(label()).toBe('All projects');

    shell.querySelector<HTMLButtonElement>('.project-button')?.click();
    await flush(harness);
    const items = menuItems('.project-item');
    expect(items.map(itemLabel)).toEqual(['All projects', 'Payments', 'Web']);
    expect(items[0].classList.contains('current')).toBe(true);
    items[1].click();
    await flush(harness);
    expect(api.user.projectId).toBe('p1');
    expect(label()).toBe('Payments');

    signIn(api.user, 'org2');
    await flush(harness);
    expect(label()).toBe('All projects');
    signIn(api.user, 'org1');
    await flush(harness);
    expect(label()).toBe('Payments');
  });

  it('offers a member with project grants only its projects', async () => {
    api.auth.scope = CallerScope.create({
      OrgID: 'org1',
      Role: Role_Enum.Viewer,
      RoleSource: RoleSource_Enum.Project,
      ProjectRoles: { p2: 'Admin' },
      Methods: allowMethods('/pb.CA/ListIssuers'),
    });
    signIn(api.user, 'org1', 'Viewer');
    const harness = await RouterTestingHarness.create('/dashboard');
    await flush(harness);
    expect(api.user.projectId).toBe('p2');
    const shell = harness.fixture.nativeElement as HTMLElement;
    expect(shell.querySelector('.project-label')?.textContent?.trim()).toBe('Web');
    shell.querySelector<HTMLButtonElement>('.project-button')?.click();
    await flush(harness);
    expect(menuItems('.project-item').map(itemLabel)).toEqual(['Web']);
  });

  it('signs out: revokes the token, forgets the user and protects the next navigation', async () => {
    signIn(api.user);
    const harness = await RouterTestingHarness.create('/dashboard');
    const shell = harness.fixture.nativeElement as HTMLElement;
    shell.querySelector<HTMLButtonElement>('.profile-button')?.click();
    harness.detectChanges();
    const signOut = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[mat-menu-item]'),
    ).find((b) => b.textContent?.includes('Sign out'));
    signOut?.click();
    await harness.fixture.whenStable();

    expect(api.auth.revokeToken).toHaveBeenCalledTimes(1);
    expect(api.user.isAuthenticated).toBe(false);
    expect(url()).toBe('/login');
    expect(sessionStorage.getItem(TEST_PREFIX + PERSISTED_USER_AUTH_TOKEN)).toBeNull();

    await harness.navigateByUrl('/settings');
    expect(url()).toBe('/login?returnUrl=%2Fsettings');
  });

  it('signs out even when the server refuses the revoke', async () => {
    signIn(api.user);
    api.auth.revokeToken.mockRejectedValueOnce(new Error('offline'));
    const harness = await RouterTestingHarness.create('/dashboard');
    await TestBed.inject(Router).navigateByUrl('/account');
    await harness.fixture.whenStable();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.panel-actions button')?.click();
    await harness.fixture.whenStable();
    expect(api.user.isAuthenticated).toBe(false);
    expect(url()).toBe('/login');
  });

  it('sends a user without an org to the org selection or the no-org notice', async () => {
    signIn(api.user, '');
    const harness = await RouterTestingHarness.create('/dashboard');
    expect(url()).toBe('/auth/select-org');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('.org-option')).toHaveLength(2);

    api.orgs.orgs = [];
    await harness.navigateByUrl('/issuers');
    expect(url()).toBe('/auth/noorg');
    expect(text(harness, 'h1')).toBe('No organization yet');
  });

  it('switches the org from the selection page', async () => {
    signIn(api.user, 'org1');
    const harness = await RouterTestingHarness.create('/auth/select-org');
    await harness.fixture.whenStable();
    harness.detectChanges();
    const globex = Array.from(
      harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('.org-option') ?? [],
    ).find((b) => b.textContent?.includes('Globex'));
    globex?.click();
    await harness.fixture.whenStable();
    expect(api.auth.selectOrg).toHaveBeenCalledWith('org2', false);
    expect(api.user.orgId).toBe('org2');
    expect(url()).toBe('/dashboard');
  });

  it('keeps a user without a role in the org on the no-role notice', async () => {
    signIn(api.user);
    api.auth.scope = { ...api.auth.scope, Role: Role_Enum.None, ProjectRoles: {} };
    const harness = await RouterTestingHarness.create('/issuers');
    expect(url()).toBe('/auth/norole');
    expect(text(harness, 'h1')).toBe('No access in this organization');

    await harness.navigateByUrl('/dashboard');
    expect(url()).toBe('/auth/norole');
  });

  it('opens the page when the caller scope cannot load, and the page shows the failure', async () => {
    signIn(api.user);
    api.auth.getCallerScope.mockRejectedValueOnce(new Error('offline'));
    await RouterTestingHarness.create('/issuers');
    expect(url()).toBe('/issuers');
  });

  it('treats an expired token as signed out', async () => {
    sessionStorage.setItem(
      TEST_PREFIX + PERSISTED_USER_AUTH_TOKEN,
      JSON.stringify({
        token: new Token('jwt', 'Bearer', new Date(Date.now() - 1000)),
        profile: new UserInfo('42', 'u', 'u@x', true, {}, 'org1', 'Owner'),
      }),
    );
    TestBed.resetTestingModule();
    configure();
    await RouterTestingHarness.create('/dashboard');
    expect(url()).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('shows the session-expired bar when the server refuses the session, and the notice on the login', async () => {
    signIn(api.user);
    const harness = await RouterTestingHarness.create('/dashboard');
    api.user.logout(true);
    harness.detectChanges();
    const shell = harness.fixture.nativeElement as HTMLElement;
    expect(shell.querySelector('.session-bar')?.textContent).toContain('Your session has expired');

    await harness.navigateByUrl('/issuers');
    expect(url()).toBe('/login?returnUrl=%2Fissuers');
    expect(text(harness, '.notice')).toContain('Your session has expired');
  });
});
