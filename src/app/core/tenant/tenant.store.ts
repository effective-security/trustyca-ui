import { Injectable, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { Project, RoleSource_Enum } from 'src/services/trustyca/protogen/orgs';
import { ItemStatus_Enum } from 'src/services/trustyca/protogen/types';
import { INITIAL_CURSOR } from '../api/paged-resource';
import { APP_USER, ORGS_SERVICE } from '../api/tokens';
import { AuthStore } from '../auth/auth.store';

/** The page size of ListProjects; the store follows the cursors to the end */
export const PROJECT_PAGE_SIZE = 200;
/** The most pages of projects the store reads in one org */
const MAX_PROJECT_PAGES = 10;

/** The label of an empty ProjectID: the resource belongs to the org itself */
export const ORG_WIDE = 'Org-wide';
/** The label of an empty project selection */
export const ALL_PROJECTS = 'All projects';

/**
 * What every page of the org needs and what is costly to re-fetch: the
 * projects, the project selection (persisted per org in AppUser) and the
 * issuer labels by key identifier, which the CA pages collect. Everything
 * follows the org of the session: a switch starts from nothing.
 */
@Injectable({ providedIn: 'root' })
export class TenantStore {
  private readonly auth = inject(AuthStore);
  private readonly orgs = inject(ORGS_SERVICE);
  private readonly user = inject(APP_USER);
  private readonly labels = signal<ReadonlyMap<string, string>>(new Map());

  /** Every project of the org, loaded once per org; invalidateProjects() after a change */
  readonly projects = resource({
    params: () => this.auth.orgId() || undefined,
    loader: () => this.loadProjects(),
  });

  /** The selected project of the org, '' for all projects */
  readonly projectId = this.auth.projectId;

  /**
   * True when the caller holds a role in the org itself and may look at
   * every project; a member with project grants only picks among them. An
   * unloaded scope counts as org-wide until it answers.
   */
  readonly hasOrgWideRole = computed(() => {
    const scope = this.auth.callerScope();
    return !scope || scope.RoleSource !== RoleSource_Enum.Project;
  });

  /** The IDs of the projects the caller holds a role in, sorted */
  readonly grantedProjectIds = computed(() =>
    Object.keys(this.auth.callerScope()?.ProjectRoles ?? {}).sort(),
  );

  private readonly projectList = computed(() =>
    this.projects.hasValue() ? this.projects.value() : [],
  );
  private readonly byId = computed(() => new Map(this.projectList().map((p) => [p.ID, p])));

  /**
   * The projects the selector offers: the active ones of the org, or the
   * granted ones for a member with project grants only (by ID when the
   * list does not hold them)
   */
  readonly selectableProjects = computed(() => {
    if (this.hasOrgWideRole()) {
      return this.projectList().filter((p) => p.Status !== ItemStatus_Enum.Inactive);
    }
    const byId = this.byId();
    return this.grantedProjectIds().map(
      (id) => byId.get(id) ?? Project.create({ ID: id, Name: id, Alias: id }),
    );
  });

  /** The selected project, when the list knows it */
  readonly selectedProject = computed(() => this.byId().get(this.projectId()));

  /** The selection as the toolbar shows it */
  readonly selectionLabel = computed(() => {
    const id = this.projectId();
    return id ? this.projectName(id) : ALL_PROJECTS;
  });

  /** The issuer labels the CA pages collected in this org, by the SKID of the issuer (the IKID its certificates carry) */
  readonly issuerLabels = this.labels.asReadonly();

  constructor() {
    // the org changed: the labels of its issuers are gone (the projects
    // reload by themselves, keyed by the org)
    effect(() => {
      this.auth.orgId();
      untracked(() => this.labels.set(new Map()));
    });
    // a member with project grants only works in one of them
    effect(() => {
      if (this.hasOrgWideRole()) {
        return;
      }
      const granted = this.grantedProjectIds();
      if (granted.length > 0 && !granted.includes(this.projectId())) {
        untracked(() => this.selectProject(granted[0]));
      }
    });
  }

  /** Selects the project of the org, '' for all; persisted per org */
  selectProject(projectId: string): void {
    this.user.setProjectId(projectId);
  }

  /** Reads the projects again after one was registered, changed or deleted */
  invalidateProjects(): void {
    this.projects.reload();
  }

  /** The name of a project, or its ID while the list does not know it */
  projectName(projectId: string): string {
    const p = this.byId().get(projectId);
    return p ? p.Name || p.Alias : projectId;
  }

  /** 'Org-wide' for an empty ProjectID, else the project name */
  scopeLabel(projectId: string): string {
    return projectId ? this.projectName(projectId) : ORG_WIDE;
  }

  /** Keeps the labels of the issuers a CA page received, by their SKID (the IKID of the certificates they issue) */
  rememberIssuerLabels(entries: Iterable<readonly [string, string]>): void {
    this.labels.update((current) => {
      const next = new Map(current);
      for (const [ikid, label] of entries) {
        next.set(ikid, label);
      }
      return next;
    });
  }

  issuerLabel(ikid: string): string | undefined {
    return this.labels().get(ikid);
  }

  /** Forgets everything of the org: the labels, and the projects reload */
  reset(): void {
    this.labels.set(new Map());
    this.projects.reload();
  }

  private async loadProjects(): Promise<Project[]> {
    const all: Project[] = [];
    let cursor = INITIAL_CURSOR;
    for (let page = 0; page < MAX_PROJECT_PAGES && cursor; page++) {
      const res = await this.orgs.listProjects({ Limit: PROJECT_PAGE_SIZE, Cursor: cursor });
      all.push(...res.Projects);
      cursor = res.NextPage?.Cursor ?? '';
    }
    return all.sort((a, b) => (a.Name || a.Alias).localeCompare(b.Name || b.Alias));
  }
}
