import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { getRoleDisplayName } from 'src/services/trustyca/rpc/enums';
import { AuthStore } from '../../core/auth/auth.store';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { Icon } from '../../shared/icon/icon';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-dashboard',
  imports: [MatButtonModule, RouterLink, EmptyState, Icon, PageHeading],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly session = inject(AuthStore);
  protected readonly roleLabel = computed(() => {
    const role = this.session.orgRole();
    return role ? getRoleDisplayName(role) : '';
  });
}
