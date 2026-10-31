import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { Role_Enum } from 'src/services/trustyca/protogen/orgs';
import { AuthorityType_Enum, IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';
import { CaUnavailableError } from 'src/services/trustyca/rpc/errors';
import { routes } from '../../app.routes';
import { TenantStore } from '../../core/tenant/tenant.store';
import {
  CERT_PEM,
  callerScope,
  clearStorage,
  createTestApi,
  KEY_PEM,
  ROOT_PEM,
  signIn,
  TestApi,
  VIEWER_METHODS,
} from '../../testing/test-api';

const unavailable = () =>
  new CaUnavailableError(new RpcError('CA is not available', 'UNAVAILABLE'));

describe('Issuers', () => {
  let api: TestApi;

  beforeEach(() => {
    clearStorage();
    api = createTestApi();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), ...api.providers] });
    signIn(api.user);
  });

  afterEach(() => clearStorage());

  /** Lets the fakes answer and renders the page and the overlays */
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
  const url = () => TestBed.inject(Router).url;
  const page = (harness: RouterTestingHarness) => harness.fixture.nativeElement as HTMLElement;
  const texts = (root: ParentNode | null | undefined, selector: string) =>
    Array.from(root?.querySelectorAll(selector) ?? []).map((e) => e.textContent?.trim());
  const setValue = (input: Element | null | undefined, value: string) => {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  };
  const submit = (form: Element | null | undefined) => form?.dispatchEvent(new Event('submit'));
  const click = (root: ParentNode | null | undefined, selector: string) =>
    root?.querySelector<HTMLElement>(selector)?.click();
  const select = async (harness: RouterTestingHarness, selector: string, option: string) => {
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);
    const field = await loader.getHarness(MatSelectHarness.with({ selector }));
    await field.open();
    await field.clickOptions({ text: new RegExp('^' + option) });
    await flush(harness);
  };

  describe('list', () => {
    it('lists the issuers of the org with their status and remembers the labels', async () => {
      const h = await open('/issuers');
      const el = page(h);
      expect(api.ca.listIssuers).toHaveBeenCalledWith({
        ProjectID: '',
        Status: IssuerStatus_Enum.Unknown,
        Type: AuthorityType_Enum.Unknown,
        Limit: 25,
        Cursor: 'initial',
      });
      expect(texts(el, 'td.primary')).toEqual([
        'issuingCN=Acme Issuing CA, O=Acme',
        'payments-rootCN=Payments Root CA, O=Acme',
        'externalCN=Externally Signed CA, O=Acme',
        'legacyCN=Legacy Issuing CA, O=Acme',
      ]);
      expect(texts(el, 'app-status-chip')).toEqual(['Active', 'Active', 'Pending', 'Archived']);
      expect(texts(el, 'th')).toEqual(['Issuer', 'Type', 'Status', 'Scope', 'Valid until', 'CRL']);
      expect(el.querySelector('.register-link')).not.toBeNull();
      expect(el.querySelector('.import-link')).not.toBeNull();
      const tenant = TestBed.inject(TenantStore);
      expect(tenant.issuerLabel('a1b2c3d4e5f6')).toBe('issuing');
      expect(tenant.issuerLabel('root-p1')).toBe('payments-root');
      expect(tenant.issuerLabel('')).toBeUndefined();
    });

    it('filters by status and type, and follows the project selection', async () => {
      const h = await open('/issuers');
      const el = page(h);
      await select(h, '.status-filter', 'Active');
      expect(api.ca.listIssuers).toHaveBeenLastCalledWith(
        expect.objectContaining({ Status: IssuerStatus_Enum.Active, Cursor: 'initial' }),
      );
      expect(texts(el, 'td.primary').length).toBe(2);
      await select(h, '.type-filter', 'Root');
      expect(api.ca.listIssuers).toHaveBeenLastCalledWith(
        expect.objectContaining({
          Status: IssuerStatus_Enum.Active,
          Type: AuthorityType_Enum.Root,
        }),
      );
      expect(texts(el, 'td.primary')).toEqual(['payments-rootCN=Payments Root CA, O=Acme']);
      click(el, '.clear-filters');
      await flush(h);
      expect(texts(el, 'td.primary').length).toBe(4);

      api.user.setProjectId('p1');
      await flush(h);
      expect(api.ca.listIssuers).toHaveBeenLastCalledWith(
        expect.objectContaining({ ProjectID: 'p1' }),
      );
      expect(texts(el, 'td.primary')).toEqual(['payments-rootCN=Payments Root CA, O=Acme']);
      expect(el.querySelector('.panel-header p')?.textContent).toContain('the project Payments');
    });

    it('opens an issuer from its row and hides the actions from a Viewer', async () => {
      api.auth.scope = callerScope(Role_Enum.Viewer, VIEWER_METHODS);
      signIn(api.user, 'org1', 'Viewer');
      const h = await open('/issuers');
      const el = page(h);
      expect(el.querySelector('.register-link')).toBeNull();
      expect(el.querySelector('.import-link')).toBeNull();
      el.querySelectorAll<HTMLElement>('tr.mat-mdc-row')[0].click();
      await flush(h);
      expect(url()).toBe('/issuers/i1/overview');
      expect(el.querySelector('.archive-button')).toBeNull();
    });

    it('shows the unavailable state when the CA does not answer and tries again', async () => {
      api.ca.listIssuers.mockRejectedValueOnce(unavailable());
      const h = await open('/issuers');
      const el = page(h);
      const state = el.querySelector('app-ca-unavailable');
      expect(state?.textContent).toContain('CA service unavailable');
      expect(state?.textContent).toContain('CA is not available');
      expect(el.querySelector('app-data-table')).toBeNull();
      click(state, '.retry-button');
      await flush(h);
      expect(api.ca.listIssuers).toHaveBeenCalledTimes(2);
      expect(el.querySelector('app-ca-unavailable')).toBeNull();
      expect(texts(el, 'td.primary').length).toBe(4);
    });
  });

  describe('details', () => {
    it('shows the overview, the chain and the profiles of an Active issuer', async () => {
      const h = await open('/issuers/i1');
      const el = page(h);
      expect(url()).toBe('/issuers/i1/overview');
      expect(el.querySelector('h1')?.textContent).toBe('issuing');
      expect(el.querySelector('.eyebrow')?.textContent).toContain('Issuing authority');
      expect(texts(el, '.issuer-chips app-status-chip')).toEqual(['Active']);
      expect(texts(el, '.issuer-chips .subtle-tag')).toEqual(['Org-wide', 'Key in inmem']);
      expect(texts(el, 'a[mat-tab-link]')).toEqual([
        'Overview',
        'Chain',
        'Profiles',
        'Configuration',
      ]);
      expect(el.querySelector('.archive-button')).not.toBeNull();
      expect(el.querySelector('.activate-button')).toBeNull();
      expect(el.querySelector('.destroy-button')).toBeNull();
      const values = texts(el, '.kv-list dd');
      expect(values).toContain('CN=Acme Issuing CA, O=Acme');
      expect(values).toContain('A1:B2:C3:D4:E5:F6');
      expect(values).toContain('3');
      expect(el.querySelector('.breadcrumb')?.textContent).toContain('Issuers');

      await h.navigateByUrl('/issuers/i1/chain');
      await flush(h);
      expect(texts(el, '.pem-title')).toEqual(['Issuer certificate', 'Root']);
      expect(el.querySelector('.certificate-viewer .pem-text')?.textContent).toBe(CERT_PEM);
      expect(el.querySelector('.bundle-button')).not.toBeNull();

      await h.navigateByUrl('/issuers/i1/profiles');
      await flush(h);
      expect(texts(el, '.profile-list a')).toEqual(['server', 'client', 'tenant_ca']);
      expect(api.ca.getIssuer).toHaveBeenCalledTimes(1);
    });

    it('offers Activate to a Pending issuer and activates it with the signed chain', async () => {
      const h = await open('/issuers/i3/chain');
      const el = page(h);
      expect(el.querySelector('.pending-note')).not.toBeNull();
      expect(texts(el, '.pem-title')).toEqual(['Signing request', 'Issuer certificate', 'Root']);
      expect(el.querySelector('.csr-viewer .pem-text')?.textContent).toContain(
        'CERTIFICATE REQUEST',
      );
      expect(el.querySelector('.archive-button')).toBeNull();
      click(el, '.activate-button');
      await flush(h);
      const dialog = document.querySelector('app-activate-issuer-dialog');
      expect(dialog?.textContent).toContain('Activate external');
      submit(dialog?.querySelector('form'));
      await flush(h);
      expect(api.ca.activateIssuer).not.toHaveBeenCalled();
      expect(texts(dialog, 'mat-error')).toEqual(['Issuer certificate is required.']);

      setValue(dialog?.querySelector('.certificate-input textarea'), 'not a pem');
      await flush(h);
      expect(texts(dialog, 'mat-error')[0]).toContain('Paste a PEM block');
      setValue(dialog?.querySelector('.certificate-input textarea'), CERT_PEM);
      setValue(dialog?.querySelector('.root-input textarea'), ROOT_PEM);
      submit(dialog?.querySelector('form'));
      await flush(h);
      expect(api.ca.activateIssuer).toHaveBeenCalledWith({
        ID: 'i3',
        Certificate: CERT_PEM,
        Intermediates: '',
        Root: ROOT_PEM,
        ProjectID: '',
      });
      expect(document.querySelector('app-activate-issuer-dialog')).toBeNull();
      expect(texts(el, '.issuer-chips app-status-chip')).toEqual(['Active']);
      expect(el.querySelector('.pending-note')).toBeNull();
      expect(el.querySelector('.archive-button')).not.toBeNull();
      expect(texts(el, '.pem-title')).toEqual(['Issuer certificate', 'Root']);
    });

    it('keeps the refusal of ActivateIssuer in the dialog', async () => {
      api.ca.activateIssuer.mockRejectedValueOnce(
        new RpcError(
          'failed to activate issuer: certificate is for another key',
          'INVALID_ARGUMENT',
        ),
      );
      const h = await open('/issuers/i3');
      click(page(h), '.activate-button');
      await flush(h);
      const dialog = document.querySelector('app-activate-issuer-dialog');
      setValue(dialog?.querySelector('.certificate-input textarea'), CERT_PEM);
      submit(dialog?.querySelector('form'));
      await flush(h);
      expect(dialog?.querySelector('app-request-error')?.textContent).toContain(
        'certificate is for another key',
      );
      expect(document.querySelector('app-activate-issuer-dialog')).not.toBeNull();
      click(dialog, 'button[mat-dialog-close]');
      await flush(h);
      expect(document.querySelector('app-activate-issuer-dialog')).toBeNull();
    });

    it('archives an Active issuer, then destroys it after a typed confirmation', async () => {
      const h = await open('/issuers/i1');
      const el = page(h);
      click(el, '.archive-button');
      await flush(h);
      let dialog = document.querySelector('app-confirm-dialog');
      expect(dialog?.textContent).toContain('Archive issuing?');
      expect(dialog?.textContent).toContain('CRL and the OCSP responses keep being served');
      expect(dialog?.querySelector('input')).toBeNull();
      click(dialog, '.confirm-button');
      await flush(h);
      expect(api.ca.updateIssuer).toHaveBeenCalledWith({
        ID: 'i1',
        Status: IssuerStatus_Enum.Archived,
        ProjectID: '',
      });
      expect(texts(el, '.issuer-chips app-status-chip')).toEqual(['Archived']);
      expect(el.querySelector('.archive-button')).toBeNull();
      expect(el.querySelector('.destroy-button')).not.toBeNull();

      click(el, '.destroy-button');
      await flush(h);
      dialog = document.querySelector('app-confirm-dialog');
      expect(dialog?.textContent).toContain('Destroy issuing?');
      expect(dialog?.textContent).toContain('No CRL and no OCSP response');
      const confirm = dialog?.querySelector<HTMLButtonElement>('.confirm-button');
      expect(confirm?.disabled).toBe(true);
      setValue(dialog?.querySelector('input'), 'issuing');
      await flush(h);
      confirm?.click();
      await flush(h);
      expect(api.ca.updateIssuer).toHaveBeenLastCalledWith({
        ID: 'i1',
        Status: IssuerStatus_Enum.Destroyed,
        ProjectID: '',
      });
      expect(texts(el, '.issuer-chips app-status-chip')).toEqual(['Destroyed']);
      expect(el.querySelector('.destroy-button')).toBeNull();
    });

    it('names the project of a project issuer in the change (BE-5)', async () => {
      const h = await open('/issuers/i2');
      const el = page(h);
      expect(texts(el, '.issuer-chips .subtle-tag')[0]).toBe('Payments');
      click(el, '.archive-button');
      await flush(h);
      click(document, '.confirm-button');
      await flush(h);
      expect(api.ca.updateIssuer).toHaveBeenCalledWith({
        ID: 'i2',
        Status: IssuerStatus_Enum.Archived,
        ProjectID: 'p1',
      });
    });

    it('edits the configuration with UpdateIssuer{Config} and shows a conflict inline', async () => {
      const h = await open('/issuers/i1/configuration');
      const el = page(h);
      expect(texts(el, '.kv-list dd')).toContain('48h');
      expect(texts(el, '.kv-list dd')).toContain('tenant_ca');
      click(el, '.edit-button');
      await flush(h);
      const crl = el.querySelector<HTMLInputElement>('input[formControlName="CrlExpiry"]');
      expect(crl?.value).toBe('48h');
      setValue(crl, '72h');
      setValue(el.querySelector('input[formControlName="AllowedProfiles"]'), 'tenant_ca, server');
      submit(el.querySelector('form.config-panel'));
      await flush(h);
      expect(api.ca.updateIssuer).toHaveBeenCalledWith({
        ID: 'i1',
        Config: expect.objectContaining({
          CrlExpiry: '72h',
          AllowedProfiles: ['tenant_ca', 'server'],
          AiaURL: 'http://localhost:8888/v1/cert/:ISSUER_ID',
        }),
        ProjectID: '',
      });
      expect(el.querySelector('form.config-panel')).toBeNull();
      expect(texts(el, '.kv-list dd')).toContain('72h');
      expect(texts(el, '.kv-list dd')).toContain('tenant_ca, server');

      api.ca.updateIssuer.mockRejectedValueOnce(
        new RpcError('conflict: profile "nope" does not exist', 'FAILED_PRECONDITION'),
      );
      click(el, '.edit-button');
      await flush(h);
      setValue(el.querySelector('input[formControlName="CrlExpiry"]'), 'soon');
      submit(el.querySelector('form.config-panel'));
      await flush(h);
      expect(api.ca.updateIssuer).toHaveBeenCalledTimes(1);
      expect(el.querySelector('mat-error')?.textContent).toContain('duration');
      setValue(el.querySelector('input[formControlName="CrlExpiry"]'), '96h');
      submit(el.querySelector('form.config-panel'));
      await flush(h);
      expect(api.ca.updateIssuer).toHaveBeenCalledTimes(2);
      const error = el.querySelector('app-request-error .request-error');
      expect(error?.classList.contains('kind-conflict')).toBe(true);
      expect(error?.textContent).toContain('the server refused the request');
      expect(error?.textContent).toContain('profile "nope" does not exist');
      expect(el.querySelector('form.config-panel')).not.toBeNull();
    });

    it('shows a Viewer the configuration without Edit, and a missing issuer as not found', async () => {
      api.auth.scope = callerScope(Role_Enum.Viewer, VIEWER_METHODS);
      signIn(api.user, 'org1', 'Viewer');
      const h = await open('/issuers/i1/configuration');
      const el = page(h);
      expect(el.querySelector('.edit-button')).toBeNull();
      expect(texts(el, '.kv-list dd')).toContain('48h');

      await h.navigateByUrl('/issuers/nope');
      await flush(h);
      expect(el.querySelector('app-empty-state')?.textContent).toContain('No such issuer');
      expect(el.querySelector('h1')).toBeNull();
    });

    it('shows the unavailable state when the CA does not answer the read', async () => {
      api.ca.getIssuer.mockRejectedValueOnce(unavailable());
      const h = await open('/issuers/i1');
      const el = page(h);
      expect(el.querySelector('app-ca-unavailable')).not.toBeNull();
      click(el, '.retry-button');
      await flush(h);
      expect(el.querySelector('app-ca-unavailable')).toBeNull();
      expect(el.querySelector('h1')?.textContent).toBe('issuing');
    });
  });

  describe('register', () => {
    /** The label of the open step */
    const step = (h: RouterTestingHarness) =>
      page(h).querySelector('app-stepper .step.active .step-label')?.textContent?.trim();
    /** Clicks Next in the open step */
    const next = async (h: RouterTestingHarness) => {
      click(page(h), '.step-next');
      await flush(h);
    };

    it('registers an issuer signed by a parent of the org, with the configuration of the parent', async () => {
      const h = await open('/issuers/register');
      const el = page(h);
      expect(api.ca.listIssuers).toHaveBeenCalledWith({
        ProjectID: '',
        Status: IssuerStatus_Enum.Active,
        Limit: 200,
        Cursor: 'initial',
      });
      expect(step(h)).toBe('Scope and label');
      await next(h);
      expect(step(h)).toBe('Scope and label');
      expect(texts(el, 'mat-error')).toEqual(['A label is required.']);
      setValue(el.querySelector('input[formControlName="label"]'), 'issuing2');
      await next(h);
      expect(step(h)).toBe('Type');
      await next(h);
      expect(step(h)).toBe('Subject');
      await next(h);
      expect(step(h)).toBe('Subject');
      expect(el.querySelector('.step-error')?.textContent).toContain('common name');
      setValue(el.querySelector('input[formControlName="CommonName"]'), 'Acme Issuing CA 2');
      setValue(el.querySelector('input[formControlName="Organisation"]'), 'Acme');
      setValue(el.querySelector('input[formControlName="Country"]'), 'us');
      setValue(el.querySelector('textarea[formControlName="san"]'), 'ca2.acme.test');
      await next(h);
      expect(step(h)).toBe('Key');
      await select(h, '.algo-select', 'RSA');
      await next(h);
      expect(step(h)).toBe('Signing');
      await next(h);
      expect(step(h)).toBe('Signing');
      expect(texts(el, 'mat-error')).toEqual([
        'Choose the parent issuer.',
        'The CA profile is required.',
      ]);
      await select(h, '.parent-select', 'issuing');
      setValue(el.querySelector('input[formControlName="profile"]'), 'tenant_ca');
      await next(h);
      expect(step(h)).toBe('Configuration');
      expect(el.querySelector<HTMLInputElement>('input[formControlName="AiaURL"]')?.value).toBe(
        'http://localhost:8888/v1/cert/:ISSUER_ID',
      );
      expect(el.querySelector('.copy-config')?.textContent).toContain('Copy from issuing');
      setValue(el.querySelector('input[formControlName="CrlExpiry"]'), '24h');
      await next(h);
      expect(step(h)).toBe('Review');
      const summary = texts(el, '.review .kv-list dd');
      expect(summary).toContain('issuing2');
      expect(summary).toContain('CN=Acme Issuing CA 2, O=Acme, C=US');
      expect(summary).toContain('RSA 2048');
      expect(summary).toContain('Signed by issuing with the CA profile tenant_ca');
      expect(el.querySelector('.problems')).toBeNull();

      click(el, '.register-button');
      await flush(h);
      expect(api.ca.registerIssuer).toHaveBeenCalledWith(
        expect.objectContaining({
          ProjectID: '',
          Label: 'issuing2',
          Type: AuthorityType_Enum.Issuing,
          ParentID: 'i1',
          Profile: 'tenant_ca',
          KeySpec: { Algo: 'RSA', Size: 2048 },
          SAN: ['ca2.acme.test'],
          Subject: expect.objectContaining({ CommonName: 'Acme Issuing CA 2' }),
          Config: expect.objectContaining({
            CrlExpiry: '24h',
            AiaURL: 'http://localhost:8888/v1/cert/:ISSUER_ID',
          }),
        }),
      );
      expect(url()).toBe('/issuers/i10/overview');
      expect(el.querySelector('h1')?.textContent).toBe('issuing2');
      expect(TestBed.inject(TenantStore).issuerLabel('skid-i10')).toBe('issuing2');
    });

    it('creates a Pending issuer for an external signature and shows its request', async () => {
      const h = await open('/issuers/register');
      const el = page(h);
      setValue(el.querySelector('input[formControlName="label"]'), 'external2');
      await next(h);
      await next(h);
      setValue(el.querySelector('input[formControlName="CommonName"]'), 'External CA 2');
      await next(h);
      await next(h);
      const radios = Array.from(el.querySelectorAll<HTMLElement>('mat-radio-button'));
      radios
        .find((r) => r.textContent?.includes('Outside the CA'))
        ?.querySelector('input')
        ?.click();
      await flush(h);
      expect(el.querySelector('.parent-select')).toBeNull();
      expect(el.querySelector('input[formControlName="profile"]')).toBeNull();
      await next(h);
      await next(h);
      expect(step(h)).toBe('Review');
      expect(texts(el, '.review .kv-list dd')).toContain(
        'Externally: the issuer waits for its certificate with a signing request',
      );
      click(el, '.register-button');
      await flush(h);
      expect(api.ca.registerIssuer).toHaveBeenCalledWith(
        expect.objectContaining({ Label: 'external2', ParentID: '', Profile: '' }),
      );
      expect(url()).toBe('/issuers/register');
      const result = el.querySelector('.result-panel');
      expect(result?.textContent).toContain('external2 is waiting for its certificate');
      expect(result?.querySelector('.pem-text')?.textContent).toContain('CERTIFICATE REQUEST');

      click(result, '.activate-now');
      await flush(h);
      const dialog = document.querySelector('app-activate-issuer-dialog');
      setValue(dialog?.querySelector('.certificate-input textarea'), CERT_PEM);
      submit(dialog?.querySelector('form'));
      await flush(h);
      expect(api.ca.activateIssuer).toHaveBeenCalledWith(
        expect.objectContaining({ ID: 'i10', Certificate: CERT_PEM }),
      );
      expect(url()).toBe('/issuers/i10/overview');
      expect(texts(el, '.issuer-chips app-status-chip')).toEqual(['Active']);
    });

    it('signs a Root itself and keeps the conflict of the server on the review', async () => {
      api.ca.registerIssuer.mockRejectedValueOnce(
        new RpcError('issuer label "issuing" is already in use', 'FAILED_PRECONDITION'),
      );
      const h = await open('/issuers/register');
      const el = page(h);
      setValue(el.querySelector('input[formControlName="label"]'), 'root2');
      await next(h);
      const radios = Array.from(el.querySelectorAll<HTMLElement>('mat-radio-button'));
      radios
        .find((r) => r.textContent?.includes('Root'))
        ?.querySelector('input')
        ?.click();
      await flush(h);
      await next(h);
      setValue(el.querySelector('input[formControlName="CommonName"]'), 'Acme Root 2');
      await next(h);
      await next(h);
      expect(step(h)).toBe('Signing');
      expect(el.querySelector('mat-radio-group[formControlName="signing"]')).toBeNull();
      expect(el.querySelector('.root-note')?.textContent).toContain(
        'A Root signs its own certificate',
      );
      await next(h);
      expect(step(h)).toBe('Signing');
      setValue(el.querySelector('input[formControlName="profile"]'), 'root_ca');
      await next(h);
      await next(h);
      expect(texts(el, '.review .kv-list dd')).toContain('Self-signed with the CA profile root_ca');
      click(el, '.register-button');
      await flush(h);
      expect(api.ca.registerIssuer).toHaveBeenCalledWith(
        expect.objectContaining({
          Type: AuthorityType_Enum.Root,
          ParentID: '',
          Profile: 'root_ca',
        }),
      );
      const error = el.querySelector('app-request-error .request-error');
      expect(error?.classList.contains('kind-conflict')).toBe(true);
      expect(error?.textContent).toContain('already in use');
      expect(url()).toBe('/issuers/register');

      click(el, '.register-button');
      await flush(h);
      expect(api.ca.registerIssuer).toHaveBeenCalledTimes(2);
      expect(url()).toBe('/issuers/i10/overview');
    });

    it('offers a project member its projects and the parents visible from the project', async () => {
      api.user.setProjectId('p1');
      const h = await open('/issuers/register');
      const el = page(h);
      setValue(el.querySelector('input[formControlName="label"]'), 'payments-issuing');
      await next(h);
      await next(h);
      setValue(el.querySelector('input[formControlName="CommonName"]'), 'Payments Issuing CA');
      await next(h);
      await next(h);
      const loader = TestbedHarnessEnvironment.loader(h.fixture);
      const parents = await loader.getHarness(
        MatSelectHarness.with({ selector: '.parent-select' }),
      );
      await parents.open();
      const options = await parents.getOptions();
      const labels = await Promise.all(options.map((o) => o.getText()));
      expect(labels.map((l) => l.split('\n')[0].trim())).toEqual([
        expect.stringContaining('issuing'),
        expect.stringContaining('payments-root'),
      ]);
      await parents.clickOptions({ text: /payments-root/ });
      await flush(h);
      setValue(el.querySelector('input[formControlName="profile"]'), 'payments-ca');
      await next(h);
      await next(h);
      click(el, '.register-button');
      await flush(h);
      expect(api.ca.registerIssuer).toHaveBeenCalledWith(
        expect.objectContaining({ ProjectID: 'p1', ParentID: 'i2', Profile: 'payments-ca' }),
      );
    });
  });

  describe('import', () => {
    it('imports an issuer with its key PEM, sent once and never kept', async () => {
      const h = await open('/issuers/import');
      const el = page(h);
      submit(el.querySelector('form.panel'));
      await flush(h);
      expect(api.ca.importIssuer).not.toHaveBeenCalled();
      expect(texts(el, 'mat-error')).toEqual([
        'A label is required.',
        'Issuer certificate is required.',
        'The key URI is required.',
      ]);

      setValue(el.querySelector('input[formControlName="label"]'), 'imported');
      setValue(el.querySelector('.certificate-input textarea'), CERT_PEM);
      setValue(el.querySelector('.root-input textarea'), ROOT_PEM);
      el.querySelector<HTMLInputElement>('mat-radio-button[value="pem"] input')?.click();
      await flush(h);
      expect(el.querySelector('.sensitive-note')).not.toBeNull();
      setValue(el.querySelector('.key-input textarea'), CERT_PEM);
      await flush(h);
      expect(texts(el, '.key-input mat-error')).toEqual(['Expected a PRIVATE KEY block.']);
      setValue(el.querySelector('.key-input textarea'), KEY_PEM);
      setValue(el.querySelector('input[formControlName="CrlExpiry"]'), '48h');
      submit(el.querySelector('form.panel'));
      await flush(h);
      expect(api.ca.importIssuer).toHaveBeenCalledWith({
        ProjectID: '',
        Label: 'imported',
        Type: AuthorityType_Enum.Issuing,
        Certificate: CERT_PEM,
        Intermediates: '',
        Root: ROOT_PEM,
        KeyURI: '',
        KeyPem: KEY_PEM,
        Config: expect.objectContaining({ CrlExpiry: '48h' }),
      });
      expect(url()).toBe('/issuers/i10/overview');
      expect(el.querySelector('h1')?.textContent).toBe('imported');
    });

    it('imports an issuer with a key URI and keeps the refusal of the server on the form', async () => {
      api.ca.importIssuer.mockRejectedValueOnce(
        new RpcError('key does not match the certificate', 'INVALID_ARGUMENT'),
      );
      const h = await open('/issuers/import');
      const el = page(h);
      setValue(el.querySelector('input[formControlName="label"]'), 'byok');
      setValue(el.querySelector('.certificate-input textarea'), CERT_PEM);
      setValue(el.querySelector('input[formControlName="keyUri"]'), 'pkcs11:token=ca;object=byok');
      submit(el.querySelector('form.panel'));
      await flush(h);
      expect(api.ca.importIssuer).toHaveBeenCalledWith(
        expect.objectContaining({ KeyURI: 'pkcs11:token=ca;object=byok', KeyPem: '' }),
      );
      expect(el.querySelector('app-request-error')?.textContent).toContain(
        'key does not match the certificate',
      );
      expect(url()).toBe('/issuers/import');
    });
  });
});
