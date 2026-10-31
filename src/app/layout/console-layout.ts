import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { log } from 'src/libts/logging';
import { OrgAccess, RoleSource_Enum } from 'src/services/trustyca/protogen/orgs';
import { ORGS_SERVICE, RUNTIME_CONFIG, STATUS_SERVICE } from '../core/api/tokens';
import { AuthStore } from '../core/auth/auth.store';
import { safeReturnUrl } from '../core/auth/return-url';
import { TenantStore } from '../core/tenant/tenant.store';
import { Brand } from '../shared/brand/brand';
import { Icon, IconName } from '../shared/icon/icon';
import { NotifyService } from '../shared/notify/notify';
import { enumName } from '../shared/pipes/enum-name.pipe';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: IconName;
  /** The method the caller needs; the entry hides when the caller scope denies it */
  readonly requires?: string;
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

/** The navigation of DESIGN.md section 7 */
export const NAVIGATION: readonly NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
      { label: 'Issuers', path: '/issuers', icon: 'layers' },
      { label: 'Certificates', path: '/certificates', icon: 'certificate' },
      { label: 'Profiles', path: '/profiles', icon: 'document' },
      { label: 'Trust anchors', path: '/roots', icon: 'anchor' },
      { label: 'Revocation', path: '/revocation', icon: 'ban' },
      { label: 'Lookup', path: '/lookup', icon: 'search' },
    ],
  },
  {
    label: 'Administration',
    items: [{ label: 'Organization', path: '/org', icon: 'building', requires: '/pb.Orgs/GetOrg' }],
  },
];

const SECTION_LABELS: Record<string, string> = {
  account: 'Account',
  settings: 'Settings',
};

@Component({
  selector: 'app-console-layout',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    Brand,
    Icon,
  ],
  templateUrl: './console-layout.html',
  styleUrl: './console-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsoleLayout {
  private readonly router = inject(Router);
  private readonly status = inject(STATUS_SERVICE);
  private readonly orgsService = inject(ORGS_SERVICE);
  private readonly notify = inject(NotifyService);
  protected readonly session = inject(AuthStore);
  protected readonly tenant = inject(TenantStore);
  protected readonly appVersion = inject(RUNTIME_CONFIG).appVersion;
  protected readonly navOpen = signal(false);
  protected readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 900px)')
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** The navigation without the entries the caller scope denies */
  protected readonly navigation = computed<NavGroup[]>(() =>
    NAVIGATION.map((group) => ({
      ...group,
      items: group.items.filter((item) => this.visible(item)),
    })).filter((group) => group.items.length > 0),
  );

  /** The name of the section for the breadcrumb */
  protected readonly section = computed(() => {
    const path = this.currentPath().split(/[?#]/)[0];
    const item = NAVIGATION.flatMap((g) => g.items).find(
      (i) => path === i.path || path.startsWith(i.path + '/'),
    );
    const segment = path.split('/')[1] ?? '';
    return (
      item?.label ??
      SECTION_LABELS[segment] ??
      (segment ? segment[0].toUpperCase() + segment.slice(1) : 'Dashboard')
    );
  });

  /** The first live call: the build of the server, for the footer */
  protected readonly serverVersion = resource({ loader: () => this.status.version() });

  /** The orgs of the user, read when the org menu first opens, once per org */
  protected readonly orgMenuOpened = signal(false);
  protected readonly userOrgs = resource({
    params: () => (this.orgMenuOpened() ? this.session.orgId() : undefined),
    loader: () => this.orgsService.getUserOrgs(),
  });
  protected readonly orgOptions = computed(() =>
    [...(this.userOrgs.hasValue() ? this.userOrgs.value().Orgs : [])].sort((a, b) =>
      (a.OrgName || a.OrgAlias).localeCompare(b.OrgName || b.OrgAlias),
    ),
  );
  /** The org being switched to, while the server answers */
  protected readonly switching = signal('');

  protected readonly orgName = computed(() => {
    const org = this.session.org();
    return org ? org.Name || org.Alias : 'Organization';
  });
  protected readonly orgInitial = computed(() => this.orgName().charAt(0).toUpperCase() || 'T');
  protected readonly roleLabel = computed(() => enumName('Role', this.session.orgRole()));
  protected readonly provider = computed(() => this.session.token().Provider || '');
  /** The login URL that brings the user back to this page */
  protected readonly signInAgain = computed(() => ({
    returnUrl: safeReturnUrl(this.currentPath()) || undefined,
  }));

  constructor() {
    // the caller scope and the org follow the org of the session
    effect(() => {
      if (this.session.orgId()) {
        this.session
          .loadSession()
          .catch((err: unknown) => log.error('ConsoleLayout: loadSession', err));
      }
    });
  }

  protected orgRoleLabel(org: OrgAccess): string {
    const role = enumName('Role', org.Role);
    return org.RoleSource === RoleSource_Enum.Project ? `${role} · via projects` : role;
  }

  /** Switches the session to the org and opens its home, or the notice of a missing role */
  protected async switchOrg(org: OrgAccess): Promise<void> {
    if (org.OrgID === this.session.orgId() || this.switching()) {
      return;
    }
    this.switching.set(org.OrgID);
    try {
      await this.router.navigateByUrl(await this.session.switchOrg(org.OrgID));
    } catch (err) {
      await this.notify.error(err, 'Could not switch the organization');
    } finally {
      this.switching.set('');
    }
  }

  protected selectProject(projectId: string): void {
    this.tenant.selectProject(projectId);
  }

  protected signOut(): void {
    void this.session.signOut();
  }

  /** An entry is hidden only when the scope has loaded and denies its method */
  private visible(item: NavItem): boolean {
    return !item.requires || !this.session.callerScope() || this.session.can(item.requires);
  }
}
