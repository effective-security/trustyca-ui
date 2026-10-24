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
import { getRoleDisplayName } from 'src/services/trustyca/rpc/enums';
import { RUNTIME_CONFIG, STATUS_SERVICE } from '../core/api/tokens';
import { AuthStore } from '../core/auth/auth.store';
import { safeReturnUrl } from '../core/auth/return-url';
import { Brand } from '../shared/brand/brand';
import { Icon, IconName } from '../shared/icon/icon';

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
  protected readonly session = inject(AuthStore);
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
  protected readonly section = computed(() => {
    const path = this.currentPath().split('?')[0].split('/')[1];
    return path ? path[0].toUpperCase() + path.slice(1) : 'Dashboard';
  });
  protected readonly navigation: { label: string; path: string; icon: IconName }[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Issuers', path: '/issuers', icon: 'layers' },
    { label: 'Certificates', path: '/certificates', icon: 'certificate' },
  ];

  /** The first live call: the build of the server, for the footer */
  protected readonly serverVersion = resource({ loader: () => this.status.version() });

  protected readonly orgName = computed(() => {
    const org = this.session.org();
    return org ? org.Name || org.Alias : 'Organization';
  });
  protected readonly orgInitial = computed(() => this.orgName().charAt(0).toUpperCase() || 'T');
  protected readonly roleLabel = computed(() => {
    const role = this.session.orgRole();
    return role ? getRoleDisplayName(role) : '';
  });
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

  protected signOut(): void {
    void this.session.signOut();
  }
}
