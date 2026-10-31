import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { OrgAccess, RoleSource_Enum } from 'src/services/trustyca/protogen/orgs';
import { getRoleDisplayName } from 'src/services/trustyca/rpc/enums';
import { toUiError } from '../../core/api/errors';
import { ORGS_SERVICE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { HOME_ROUTE } from '../../core/auth/return-url';
import { Icon } from '../../shared/icon/icon';
import { AuthLayout } from './auth-layout';

/** The orgs of the user (Orgs.GetUserOrgs); a pick switches the session with SelectOrg */
@Component({
  selector: 'app-select-org',
  imports: [AuthLayout, Icon, MatButtonModule],
  templateUrl: './select-org.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectOrg {
  private readonly orgsService = inject(ORGS_SERVICE);
  private readonly router = inject(Router);
  protected readonly session = inject(AuthStore);

  protected readonly orgs = resource({ loader: () => this.orgsService.getUserOrgs() });
  protected readonly items = computed(() =>
    [...(this.orgs.hasValue() ? this.orgs.value().Orgs : [])].sort((a, b) =>
      (a.OrgName || a.OrgAlias).localeCompare(b.OrgName || b.OrgAlias),
    ),
  );
  protected readonly busyId = signal('');
  protected readonly failure = signal('');
  protected readonly loadError = computed(() =>
    this.orgs.error() ? toUiError(this.orgs.error()).detail : '',
  );

  protected roleLabel(org: OrgAccess): string {
    const role = getRoleDisplayName(org.Role);
    return org.RoleSource === RoleSource_Enum.Project ? `${role} · via projects` : role;
  }

  protected async select(org: OrgAccess): Promise<void> {
    this.failure.set('');
    if (org.OrgID === this.session.orgId()) {
      await this.router.navigateByUrl(HOME_ROUTE);
      return;
    }
    this.busyId.set(org.OrgID);
    try {
      await this.router.navigateByUrl(await this.session.switchOrg(org.OrgID), {
        replaceUrl: true,
      });
    } catch (err) {
      this.failure.set(toUiError(err).detail);
    } finally {
      this.busyId.set('');
    }
  }
}
