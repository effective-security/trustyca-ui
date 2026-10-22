import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { PreviewSession } from '../core/auth/preview-session';
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
  private readonly session = inject(PreviewSession);
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

  protected logout(): void {
    this.session.logout();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }
}
