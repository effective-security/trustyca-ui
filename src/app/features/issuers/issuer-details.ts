import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { Issuer, IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';
import { toUiError } from '../../core/api/errors';
import { CA_SERVICE } from '../../core/api/tokens';
import { CaUnavailable } from '../../shared/ca-state/ca-unavailable';
import { ConfirmService } from '../../shared/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { Icon } from '../../shared/icon/icon';
import { NotifyService } from '../../shared/notify/notify';
import { EnumNamePipe } from '../../shared/pipes/enum-name.pipe';
import { ScopeNamePipe } from '../../shared/pipes/scope-name.pipe';
import { StatusChip, issuerStatusTone } from '../../shared/status-chip/status-chip';
import { ActivateIssuerDialog } from './activate-issuer-dialog';
import { IssuerPage } from './issuer-page';

interface IssuerTab {
  readonly label: string;
  readonly path: string;
}

const TABS: readonly IssuerTab[] = [
  { label: 'Overview', path: 'overview' },
  { label: 'Chain', path: 'chain' },
  { label: 'Profiles', path: 'profiles' },
  { label: 'Configuration', path: 'configuration' },
];

/**
 * One issuer (DESIGN.md section 8.1): its identity and status, the actions
 * its status allows (Activate a Pending one, Archive an Active one, Destroy
 * an Archived one) and the tabs
 */
@Component({
  selector: 'app-issuer-details',
  imports: [
    MatButtonModule,
    MatTabsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    CaUnavailable,
    EmptyState,
    EnumNamePipe,
    Icon,
    ScopeNamePipe,
    StatusChip,
  ],
  templateUrl: './issuer-details.html',
  styleUrl: './issuer-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuerDetails {
  private readonly ca = inject(CA_SERVICE);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotifyService);
  protected readonly page = inject(IssuerPage);
  protected readonly tabs = TABS;
  protected readonly issuer = this.page.current;
  protected readonly statusTone = issuerStatusTone;
  protected readonly PENDING = IssuerStatus_Enum.Pending;
  /** The failure of the read, when it is not the CA being unreachable */
  protected readonly failure = computed(() => {
    const err = this.page.issuer.error();
    return err === undefined || this.page.unavailable() ? undefined : toUiError(err);
  });
  private readonly routeId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  constructor() {
    effect(() => this.page.select(this.routeId()));
  }

  /** ActivateIssuer with the signed certificate and its chain, in a dialog */
  protected async activate(): Promise<void> {
    const issuer = this.issuer();
    if (!issuer) {
      return;
    }
    const activated = await ActivateIssuerDialog.open(this.dialog, issuer);
    if (activated) {
      this.page.updated(activated);
      this.notify.info(`Issuer ${activated.Label} activated`);
    }
  }

  /** UpdateIssuer{Status: Archived}: the issuer stops signing, CRL and OCSP go on */
  protected async archive(): Promise<void> {
    const issuer = this.issuer();
    if (!issuer) {
      return;
    }
    const confirmed = await this.confirm.confirm({
      title: `Archive ${issuer.Label}?`,
      message: 'The issuer stops signing certificates. It cannot become active again.',
      details: [
        'The certificates it issued stay valid: the CRL and the OCSP responses keep being served.',
        'The private key is kept; Destroy removes it later.',
      ],
      confirmLabel: 'Archive issuer',
      destructive: true,
    });
    if (confirmed) {
      await this.changeStatus(issuer, IssuerStatus_Enum.Archived, 'archived');
    }
  }

  /** UpdateIssuer{Status: Destroyed}: the key is destroyed, CRL and OCSP stop */
  protected async destroy(): Promise<void> {
    const issuer = this.issuer();
    if (!issuer) {
      return;
    }
    const confirmed = await this.confirm.confirm({
      title: `Destroy ${issuer.Label}?`,
      message: 'The private key of the issuer is destroyed. This cannot be undone.',
      details: [
        'No CRL and no OCSP response is produced any more: relying parties can no longer check the certificates it issued.',
        'The issuer record and its certificate stay for the audit trail.',
      ],
      typeToConfirm: issuer.Label,
      confirmLabel: 'Destroy issuer',
      destructive: true,
    });
    if (confirmed) {
      await this.changeStatus(issuer, IssuerStatus_Enum.Destroyed, 'destroyed');
    }
  }

  private async changeStatus(
    issuer: Issuer,
    status: IssuerStatus_Enum,
    done: string,
  ): Promise<void> {
    try {
      const updated = await this.ca.updateIssuer({
        ID: issuer.ID,
        Status: status,
        ProjectID: this.page.scopeOf(issuer),
      });
      this.page.updated(updated);
      this.notify.info(`Issuer ${updated.Label} ${done}`);
    } catch (err) {
      await this.notify.error(err, `Could not change the status of ${issuer.Label}`);
    }
  }
}
