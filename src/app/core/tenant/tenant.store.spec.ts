import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CallerScope } from 'src/services/trustyca/protogen/auth';
import { ProjectsResponse, Role_Enum, RoleSource_Enum } from 'src/services/trustyca/protogen/orgs';
import { clearStorage, createTestApi, project, signIn, TestApi } from '../../testing/test-api';
import { AuthStore } from '../auth/auth.store';
import { TenantStore } from './tenant.store';

describe('TenantStore', () => {
  let api: TestApi;
  let auth: AuthStore;
  let store: TenantStore;

  /** Runs the effects and waits for the resources */
  const settle = async () => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();
  };

  beforeEach(() => {
    clearStorage();
    api = createTestApi();
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...api.providers] });
    auth = TestBed.inject(AuthStore);
    store = TestBed.inject(TenantStore);
  });

  afterEach(() => clearStorage());

  it('loads the projects of the org once and offers the active ones with "All projects"', async () => {
    signIn(api.user);
    await settle();
    expect(api.orgs.listProjects).toHaveBeenCalledTimes(1);
    expect(api.orgs.listProjects).toHaveBeenCalledWith({ Limit: 200, Cursor: 'initial' });
    expect(store.projects.value()?.map((p) => p.Name)).toEqual(['Legacy', 'Payments', 'Web']);
    expect(store.selectableProjects().map((p) => p.Name)).toEqual(['Payments', 'Web']);
    expect(store.hasOrgWideRole()).toBe(true);
    expect(store.projectId()).toBe('');
    expect(store.selectionLabel()).toBe('All projects');
    expect(store.scopeLabel('')).toBe('Org-wide');
    expect(store.scopeLabel('p2')).toBe('Web');
    expect(store.scopeLabel('p9')).toBe('p9');
  });

  it('follows the cursors of ListProjects', async () => {
    api.orgs.listProjects.mockImplementation(async (req) =>
      req.Cursor === 'initial'
        ? ProjectsResponse.create({
            Projects: [project('p2', 'Web')],
            NextPage: { Offset: 0, Cursor: 'c2' },
          })
        : ProjectsResponse.create({ Projects: [project('p1', 'Payments')] }),
    );
    signIn(api.user);
    await settle();
    expect(api.orgs.listProjects.mock.calls.map((c) => c[0].Cursor)).toEqual(['initial', 'c2']);
    expect(store.projects.value()?.map((p) => p.ID)).toEqual(['p1', 'p2']);
  });

  it('keeps the project selection per org and starts the next org from nothing', async () => {
    signIn(api.user, 'org1');
    await settle();
    store.rememberIssuerLabels([['k1', 'Issuing CA']]);
    store.selectProject('p1');
    expect(store.projectId()).toBe('p1');
    expect(api.user.projectId).toBe('p1');
    expect(store.selectionLabel()).toBe('Payments');
    expect(store.selectedProject()?.Alias).toBe('payments');
    expect(store.issuerLabel('k1')).toBe('Issuing CA');

    signIn(api.user, 'org2');
    await settle();
    expect(store.projectId()).toBe('');
    expect(store.issuerLabel('k1')).toBeUndefined();
    expect(api.orgs.listProjects).toHaveBeenCalledTimes(2);

    signIn(api.user, 'org1');
    await settle();
    expect(store.projectId()).toBe('p1');
  });

  it('offers a member with project grants only its projects, and selects one', async () => {
    signIn(api.user, 'org1', 'Viewer');
    api.auth.scope = CallerScope.create({
      OrgID: 'org1',
      Role: Role_Enum.Viewer,
      RoleSource: RoleSource_Enum.Project,
      ProjectRoles: { p2: 'Admin', p9: 'User' },
    });
    await auth.loadSession();
    await settle();
    expect(store.hasOrgWideRole()).toBe(false);
    expect(store.grantedProjectIds()).toEqual(['p2', 'p9']);
    expect(store.selectableProjects().map((p) => p.Name)).toEqual(['Web', 'p9']);
    expect(store.projectId()).toBe('p2');

    store.selectProject('p9');
    await settle();
    expect(store.projectId()).toBe('p9');
    expect(store.selectionLabel()).toBe('p9');
  });

  it('reloads the projects on invalidation and on reset', async () => {
    signIn(api.user);
    await settle();
    api.orgs.projects = [...api.orgs.projects, project('p4', 'Billing')];
    store.invalidateProjects();
    await settle();
    expect(api.orgs.listProjects).toHaveBeenCalledTimes(2);
    expect(store.selectableProjects().map((p) => p.Name)).toEqual(['Billing', 'Payments', 'Web']);

    store.rememberIssuerLabels([['k1', 'Issuing CA']]);
    store.reset();
    await settle();
    expect(store.issuerLabel('k1')).toBeUndefined();
    expect(api.orgs.listProjects).toHaveBeenCalledTimes(3);
  });

  it('keeps the failure of the project list and recovers on reload', async () => {
    api.orgs.listProjects.mockRejectedValueOnce(new Error('offline'));
    signIn(api.user);
    await settle();
    expect(store.projects.error()).toBeInstanceOf(Error);
    expect(store.selectableProjects()).toEqual([]);
    store.invalidateProjects();
    await settle();
    expect(store.projects.error()).toBeUndefined();
    expect(store.selectableProjects()).toHaveLength(2);
  });
});
