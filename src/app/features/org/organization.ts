import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { PageHeading } from '../../shared/page-heading/page-heading';
import { enumName } from '../../shared/pipes/enum-name.pipe';

interface OrgTab {
  readonly label: string;
  readonly path: string;
  /** The method the tab needs; hidden when the caller scope denies it */
  readonly requires?: string;
}

const TABS: readonly OrgTab[] = [
  { label: 'General', path: 'general' },
  { label: 'Projects', path: 'projects' },
  { label: 'Members', path: 'members', requires: '/pb.Orgs/GetMembers' },
  { label: 'API keys', path: 'api-keys', requires: '/pb.Orgs/ListAPIKeys' },
];

/** The organization of the session: General, Projects, Members and API keys */
@Component({
  selector: 'app-organization',
  imports: [MatTabsModule, RouterLink, RouterLinkActive, RouterOutlet, PageHeading],
  template: `<app-page-heading
      eyebrow="Administration"
      [title]="orgName()"
      [description]="description()"
    />
    <nav mat-tab-nav-bar class="org-tabs" aria-label="Organization sections" [tabPanel]="panel">
      @for (tab of tabs(); track tab.path) {
        <a
          mat-tab-link
          [routerLink]="tab.path"
          routerLinkActive
          #active="routerLinkActive"
          [active]="active.isActive"
          >{{ tab.label }}</a
        >
      }
    </nav>
    <mat-tab-nav-panel #panel><router-outlet /></mat-tab-nav-panel>`,
  styles: `
    .org-tabs {
      margin-bottom: 24px;
      --mat-tab-header-label-text-size: 13px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Organization {
  protected readonly session = inject(AuthStore);
  protected readonly orgName = computed(() => {
    const org = this.session.org();
    return org ? org.Name || org.Alias : 'Organization';
  });
  protected readonly description = computed(() => {
    const org = this.session.org();
    const role = enumName('Role', this.session.orgRole());
    const parts = [
      org?.Alias,
      role ? `You are ${role === 'Owner' || role === 'Admin' ? 'an' : 'a'} ${role}` : '',
    ];
    return parts.filter(Boolean).join(' · ') || 'The organization of your session.';
  });
  /** The tabs without the ones the caller scope denies */
  protected readonly tabs = computed(() =>
    TABS.filter(
      (tab) => !tab.requires || !this.session.callerScope() || this.session.can(tab.requires),
    ),
  );
}
