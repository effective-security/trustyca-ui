import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { Role_Enum } from 'src/services/trustyca/protogen/orgs';
import { Trust_Enum } from 'src/services/trustyca/protogen/pkix';
import { CaUnavailableError } from 'src/services/trustyca/rpc/errors';
import { routes } from '../../app.routes';
import {
  callerScope,
  clearStorage,
  createTestApi,
  ROOT_PEM,
  signIn,
  TestApi,
  VIEWER_METHODS,
} from '../../testing/test-api';

describe('Trust anchors', () => {
  let api: TestApi;

  beforeEach(() => {
    clearStorage();
    api = createTestApi();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), ...api.providers] });
    signIn(api.user);
  });

  afterEach(() => clearStorage());

  const flush = async (harness: RouterTestingHarness) => {
    await harness.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
    TestBed.inject(ApplicationRef).tick();
  };
  const open = async (path: string) => {
    const harness = await RouterTestingHarness.create(path);
    await flush(harness);
    return harness;
  };
  const page = (harness: RouterTestingHarness) => harness.fixture.nativeElement as HTMLElement;
  const texts = (root: ParentNode | null | undefined, selector: string) =>
    Array.from(root?.querySelectorAll(selector) ?? []).map((e) => e.textContent?.trim());
  const setValue = (input: Element | null | undefined, value: string) => {
    if (input instanceof HTMLTextAreaElement) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  };

  it('lists the roots of the org and of the platform', async () => {
    const h = await open('/roots');
    const el = page(h);
    expect(api.ca.listRoots).toHaveBeenCalledWith({ Limit: 50, Cursor: 'initial' });
    expect(api.cis.getRoots).toHaveBeenCalledWith('');
    const sections = el.querySelectorAll('section.panel');
    expect(texts(sections[0], 'td.primary')).toEqual(['CN=Payments Root CA, O=AcmeSKID 5B:1D:01']);
    expect(texts(sections[0], 'app-status-chip')).toEqual(['Private']);
    expect(texts(sections[1], 'td.primary')).toEqual([
      'CN=Trusty Root CA, O=TrustySKID 5B:1D:01',
      'CN=Trusty Public Root, O=TrustySKID 5B:1D:02',
    ]);
    expect(texts(sections[1], 'app-status-chip')).toEqual(['Private', 'Public']);
    expect(el.querySelector('.register-button')).not.toBeNull();

    sections[1].querySelectorAll<HTMLButtonElement>('.view-root')[1].click();
    await flush(h);
    const dialog = document.querySelector('app-pem-dialog');
    expect(dialog?.querySelector('h2')?.textContent).toBe('CN=Trusty Public Root, O=Trusty');
    expect(dialog?.querySelector('.pem-text')?.textContent).toBe(ROOT_PEM);
    dialog?.querySelector<HTMLButtonElement>('button[mat-dialog-close]')?.click();
    await flush(h);
    expect(document.querySelector('app-pem-dialog')).toBeNull();
  });

  it('registers an external anchor and reloads the list', async () => {
    const h = await open('/roots');
    const el = page(h);
    el.querySelector<HTMLButtonElement>('.register-button')?.click();
    await flush(h);
    const dialog = document.querySelector('app-register-root-dialog');
    dialog?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await flush(h);
    expect(api.ca.registerRoot).not.toHaveBeenCalled();
    expect(texts(dialog, 'mat-error')).toEqual(['Root certificate is required.']);
    setValue(dialog?.querySelector('.root-input textarea'), ROOT_PEM);
    dialog?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await flush(h);
    expect(api.ca.registerRoot).toHaveBeenCalledWith({ Pem: ROOT_PEM, Trust: Trust_Enum.Private });
    expect(document.querySelector('app-register-root-dialog')).toBeNull();
    expect(api.ca.listRoots).toHaveBeenCalledTimes(2);
    expect(texts(el.querySelectorAll('section.panel')[0], 'td.primary').length).toBe(2);
  });

  it('keeps the refusal of RegisterRoot in the dialog', async () => {
    api.ca.registerRoot.mockRejectedValueOnce(
      new RpcError('certificate is not a self-signed CA certificate', 'INVALID_ARGUMENT'),
    );
    const h = await open('/roots');
    page(h).querySelector<HTMLButtonElement>('.register-button')?.click();
    await flush(h);
    const dialog = document.querySelector('app-register-root-dialog');
    setValue(dialog?.querySelector('.root-input textarea'), ROOT_PEM);
    dialog?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await flush(h);
    expect(dialog?.querySelector('app-request-error')?.textContent).toContain(
      'not a self-signed CA certificate',
    );
    expect(document.querySelector('app-register-root-dialog')).not.toBeNull();
  });

  it('hides Register from a Viewer and shows the unavailable state for the org roots only', async () => {
    api.auth.scope = callerScope(Role_Enum.Viewer, VIEWER_METHODS);
    signIn(api.user, 'org1', 'Viewer');
    api.ca.listRoots.mockRejectedValueOnce(
      new CaUnavailableError(new RpcError('CA is not configured', 'UNAVAILABLE')),
    );
    const h = await open('/roots');
    const el = page(h);
    expect(el.querySelector('.register-button')).toBeNull();
    const sections = el.querySelectorAll('section.panel');
    expect(sections[0].querySelector('app-ca-unavailable')?.textContent).toContain(
      'CA is not configured',
    );
    expect(texts(sections[1], 'td.primary').length).toBe(2);
    sections[0].querySelector<HTMLButtonElement>('.retry-button')?.click();
    await flush(h);
    expect(sections[0].querySelector('app-ca-unavailable')).toBeNull();
    expect(texts(sections[0], 'td.primary').length).toBe(1);
  });
});
