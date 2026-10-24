import { StorageService } from 'src/services/storage';
import { AppPlatformService } from './AppPlatform';
import { PlatformInfo } from './PlatformInfo';

describe('AppPlatformService', () => {
  it('reports the browser platform', () => {
    const pti = new PlatformInfo('Test', window);
    const appPlatform = new AppPlatformService(new StorageService(pti), pti);

    expect(appPlatform.appVersion).toBe('Test');
    expect(appPlatform.locationHost).toBe(window.location.hostname);
    expect(appPlatform.isLocal).toBe(true);
    expect(appPlatform.isOutlook).toBe(false);
    expect(appPlatform.isAndroid).toBe(false);
    expect(appPlatform.isiOS).toBe(false);
    expect(appPlatform.isCordova).toBe(false);
    expect(appPlatform.isEmbedded).toBe(false);
    expect(appPlatform.deviceID).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(appPlatform.toString()).deviceID).toBe(appPlatform.deviceID);
  });

  it('opens and redirects through the window', () => {
    const open = vi.fn();
    const assign = vi.fn();
    const replaceState = vi.fn();
    const fakeWindow = {
      location: { hostname: 'app.local.trustyca.io', protocol: 'https:', port: '4200', assign },
      navigator: { userAgent: 'Mozilla/5.0 (iPhone)' },
      history: { state: { id: 1 }, replaceState },
      open,
    } as unknown as Window;
    const pti = new PlatformInfo('Test', fakeWindow);
    const appPlatform = new AppPlatformService(new StorageService(), pti);

    expect(pti.locationUrl).toBe('https://app.local.trustyca.io:4200');
    expect(pti.isiOS).toBe(true);
    expect(pti.isLocal).toBe(false);

    appPlatform.openUrl('https://example.com');
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener');
    appPlatform.redirect('https://localhost:8880/v1/auth/authorize');
    expect(assign).toHaveBeenCalledWith('https://localhost:8880/v1/auth/authorize');
    appPlatform.replaceHistoryUrl('/auth/authenticated');
    expect(replaceState).toHaveBeenCalledWith({ id: 1 }, '', '/auth/authenticated');
  });
});
