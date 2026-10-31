import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { Role_Enum } from 'src/services/trustyca/protogen/orgs';
import { routes } from '../../app.routes';
import { callerScope, clearStorage, createTestApi, signIn, TestApi } from '../../testing/test-api';

describe('Organization page', () => {
  let api: TestApi;

  beforeEach(() => {
    clearStorage();
    api = createTestApi();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), ...api.providers] });
    signIn(api.user);
  });

  afterEach(() => clearStorage());

  /** Lets the fakes answer and renders the page and the dialogs */
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
  const texts = (root: ParentNode, selector: string) =>
    Array.from(root.querySelectorAll(selector)).map((e) => e.textContent?.trim());
  const setValue = (input: Element | null | undefined, value: string) => {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  };
  const submit = (form: Element | null | undefined) => form?.dispatchEvent(new Event('submit'));

  it('opens General with the org and the tabs of an Owner', async () => {
    const h = await open('/org');
    expect(TestBed.inject(Router).url).toBe('/org/general');
    const el = page(h);
    expect(el.querySelector('h1')?.textContent).toBe('Acme');
    expect(el.querySelector('.page-description')?.textContent).toContain('You are an Owner');
    expect(texts(el, 'a[mat-tab-link]')).toEqual(['General', 'Projects', 'Members', 'API keys']);
    const values = texts(el, '.kv-list dd');
    expect(values).toContain('Acme');
    expect(values).toContain('acme');
    expect(values).toContain('Acme Corporation');
    expect(el.querySelector('app-status-chip')?.textContent?.trim()).toBe('Active');
    expect(el.querySelector('.edit-button')).not.toBeNull();
    expect(el.querySelector('.danger-button')).not.toBeNull();
    expect(el.querySelector('.breadcrumb')?.textContent).toContain('Organization');
  });

  it('shows a Viewer the org without the actions and the admin tabs', async () => {
    api.auth.scope = callerScope(Role_Enum.Viewer, ['/pb.Orgs/GetOrg', '/pb.Orgs/ListProjects']);
    signIn(api.user, 'org1', 'Viewer');
    const h = await open('/org/general');
    const el = page(h);
    expect(texts(el, 'a[mat-tab-link]')).toEqual(['General', 'Projects']);
    expect(el.querySelector('.edit-button')).toBeNull();
    expect(el.querySelector('.danger-zone')).toBeNull();

    await h.navigateByUrl('/org/projects');
    await flush(h);
    expect(el.querySelector('.register-button')).toBeNull();
    expect(el.querySelectorAll('.edit-project')).toHaveLength(0);
    expect(texts(el, 'th')).toEqual(['Project', 'Description', 'Status', 'Created']);
  });

  it('edits the name and the description with UpdateOrg', async () => {
    const h = await open('/org/general');
    const el = page(h);
    el.querySelector<HTMLButtonElement>('.edit-button')?.click();
    h.detectChanges();
    expect(el.querySelector<HTMLInputElement>('input[formControlName="Name"]')?.value).toBe('Acme');
    setValue(el.querySelector('input[formControlName="Name"]'), 'Acme Inc');
    setValue(el.querySelector('textarea[formControlName="Description"]'), 'Rockets');
    submit(el.querySelector('form.org-form'));
    await flush(h);
    expect(api.orgs.updateOrg).toHaveBeenCalledWith({ Name: 'Acme Inc', Description: 'Rockets' });
    expect(el.querySelector('form.org-form')).toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('Acme Inc');
    expect(texts(el, '.kv-list dd')).toContain('Rockets');
  });

  it('keeps the refusal of UpdateOrg next to the form', async () => {
    api.orgs.updateOrg.mockRejectedValueOnce(
      new RpcError('org name is already in use', 'ALREADY_EXISTS'),
    );
    const h = await open('/org/general');
    const el = page(h);
    el.querySelector<HTMLButtonElement>('.edit-button')?.click();
    h.detectChanges();
    setValue(el.querySelector('input[formControlName="Name"]'), 'Globex');
    submit(el.querySelector('form.org-form'));
    await flush(h);
    expect(el.querySelector('.form-error')?.textContent).toContain('already in use');
    expect(el.querySelector('form.org-form')).not.toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('Acme');
  });

  it('deletes the org after a typed confirmation and asks for another org', async () => {
    const h = await open('/org/general');
    page(h).querySelector<HTMLButtonElement>('.danger-button')?.click();
    await flush(h);
    const dialog = document.querySelector('app-confirm-dialog');
    expect(dialog?.textContent).toContain('Delete Acme?');
    const confirm = dialog?.querySelector<HTMLButtonElement>('.confirm-button');
    expect(confirm?.disabled).toBe(true);
    setValue(dialog?.querySelector('input'), 'acme');
    await flush(h);
    expect(confirm?.disabled).toBe(false);
    confirm?.click();
    await flush(h);
    expect(api.orgs.deleteOrg).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).url).toBe('/auth/select-org');
    expect(document.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('lists the projects with their status and registers one', async () => {
    const h = await open('/org/projects');
    const el = page(h);
    expect(texts(el, 'td.primary .row-sub')).toEqual(['legacy', 'payments', 'web']);
    expect(texts(el, 'app-status-chip')).toEqual(['Inactive', 'Active', 'Active']);
    expect(el.querySelectorAll('.edit-project')).toHaveLength(3);
    expect(el.querySelectorAll('.delete-project')).toHaveLength(2);

    el.querySelector<HTMLButtonElement>('.register-button')?.click();
    await flush(h);
    const dialog = document.querySelector('app-project-dialog');
    expect(dialog).not.toBeNull();
    setValue(dialog?.querySelector('input[formControlName="Alias"]'), 'billing');
    setValue(dialog?.querySelector('input[formControlName="Name"]'), 'Billing');
    submit(dialog?.querySelector('form'));
    await flush(h);
    expect(api.orgs.registerProject).toHaveBeenCalledWith({
      Alias: 'billing',
      Name: 'Billing',
      Description: '',
    });
    expect(document.querySelector('app-project-dialog')).toBeNull();
    expect(api.orgs.listProjects).toHaveBeenCalledTimes(2);
    expect(texts(el, 'td.primary .row-sub')).toEqual(['billing', 'legacy', 'payments', 'web']);
  });

  it('keeps the refusal of RegisterProject in the dialog', async () => {
    api.orgs.registerProject.mockRejectedValueOnce(
      new RpcError('project alias is already in use', 'ALREADY_EXISTS'),
    );
    const h = await open('/org/projects');
    page(h).querySelector<HTMLButtonElement>('.register-button')?.click();
    await flush(h);
    const dialog = document.querySelector('app-project-dialog');
    submit(dialog?.querySelector('form'));
    await flush(h);
    expect(api.orgs.registerProject).not.toHaveBeenCalled();
    expect(texts(dialog as ParentNode, 'mat-error')).toEqual([
      'An alias is required.',
      'A name is required.',
    ]);

    setValue(dialog?.querySelector('input[formControlName="Alias"]'), 'web');
    setValue(dialog?.querySelector('input[formControlName="Name"]'), 'Web 2');
    submit(dialog?.querySelector('form'));
    await flush(h);
    expect(dialog?.querySelector('.form-error')?.textContent).toContain('already in use');
    expect(document.querySelector('app-project-dialog')).not.toBeNull();
    dialog?.querySelector<HTMLButtonElement>('button[mat-dialog-close]')?.click();
    await flush(h);
    expect(document.querySelector('app-project-dialog')).toBeNull();
  });

  it('edits a project, and deletes one after a typed confirmation, clearing its selection', async () => {
    api.user.setProjectId('p1');
    const h = await open('/org/projects');
    const el = page(h);
    el.querySelectorAll<HTMLButtonElement>('.edit-project')[1].click();
    await flush(h);
    const dialog = document.querySelector('app-project-dialog');
    const alias = dialog?.querySelector<HTMLInputElement>('input[formControlName="Alias"]');
    expect(alias?.value).toBe('payments');
    expect(alias?.readOnly).toBe(true);
    setValue(dialog?.querySelector('input[formControlName="Name"]'), 'Payments EU');
    submit(dialog?.querySelector('form'));
    await flush(h);
    expect(api.orgs.updateProject).toHaveBeenCalledWith({
      ProjectID: 'p1',
      Name: 'Payments EU',
      Description: '',
    });
    expect(texts(el, 'td.primary')).toContain('Payments EUpayments');

    el.querySelectorAll<HTMLButtonElement>('.delete-project')[0].click();
    await flush(h);
    const confirm = document.querySelector('app-confirm-dialog');
    expect(confirm?.textContent).toContain('Delete Payments EU?');
    setValue(confirm?.querySelector('input'), 'payments');
    await flush(h);
    confirm?.querySelector<HTMLButtonElement>('.confirm-button')?.click();
    await flush(h);
    expect(api.orgs.deleteProject).toHaveBeenCalledWith({ ProjectID: 'p1' });
    expect(api.user.projectId).toBe('');
    expect(texts(el, 'app-status-chip')).toEqual(['Inactive', 'Inactive', 'Active']);
  });
});
