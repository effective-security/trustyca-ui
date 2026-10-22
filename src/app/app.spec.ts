import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { PreviewSession } from './core/auth/preview-session';

describe('Preview navigation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  afterEach(() => sessionStorage.clear());

  it('redirects a protected deep link to login and remembers the destination', async () => {
    const harness = await RouterTestingHarness.create('/issuers');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fissuers');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Trust starts');
  });

  it('opens the requested page after the placeholder login is clicked', async () => {
    const harness = await RouterTestingHarness.create('/certificates');
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.login-button')?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/certificates');
    expect(TestBed.inject(PreviewSession).isActive()).toBe(true);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Certificates');
  });

  it('opens dashboard for a direct login and ignores external return URLs', async () => {
    const harness = await RouterTestingHarness.create('/login?returnUrl=https%3A%2F%2Fexample.com');
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.login-button')?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it('restores preview access within the tab after reloading the app', async () => {
    TestBed.inject(PreviewSession).login();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create('/issuers');
    expect(TestBed.inject(Router).url).toBe('/issuers');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Issuers');
  });

  it('removes preview access on logout and protects subsequent navigation', async () => {
    TestBed.inject(PreviewSession).login();
    const harness = await RouterTestingHarness.create('/dashboard');
    TestBed.inject(PreviewSession).logout();
    await harness.navigateByUrl('/settings');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fsettings');
    expect(sessionStorage.getItem('trustyca.preview-session')).toBeNull();
  });
});
