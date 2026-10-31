import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { AuthorityType_Enum, Issuer, IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';
import { isCaUnavailable } from 'src/services/trustyca/rpc/errors';
import { pagedResource } from '../../core/api/paged-resource';
import { CA_SERVICE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { TenantStore } from '../../core/tenant/tenant.store';
import { CaUnavailable } from '../../shared/ca-state/ca-unavailable';
import { ColumnDef } from '../../shared/data-table/column';
import { DataTable } from '../../shared/data-table/data-table';
import { Icon } from '../../shared/icon/icon';
import { PageHeading } from '../../shared/page-heading/page-heading';
import { ExpiresInPipe, Rfc3339DatePipe } from '../../shared/pipes/date.pipes';
import { EnumNamePipe, enumName } from '../../shared/pipes/enum-name.pipe';
import { ScopeNamePipe } from '../../shared/pipes/scope-name.pipe';
import { expiryState } from '../../shared/pipes/time';
import { StatusChip, issuerStatusTone } from '../../shared/status-chip/status-chip';

interface IssuerListParams {
  readonly projectId: string;
  readonly status: IssuerStatus_Enum;
  readonly type: AuthorityType_Enum;
  readonly pageSize: number;
}

interface FilterOption<T> {
  readonly value: T;
  readonly label: string;
}

const STATUS_FILTERS: readonly FilterOption<IssuerStatus_Enum>[] = [
  { value: IssuerStatus_Enum.Unknown, label: 'All statuses' },
  ...[
    IssuerStatus_Enum.Pending,
    IssuerStatus_Enum.Active,
    IssuerStatus_Enum.Archived,
    IssuerStatus_Enum.Destroyed,
  ].map((value) => ({ value, label: enumName('IssuerStatus', value) })),
];

const TYPE_FILTERS: readonly FilterOption<AuthorityType_Enum>[] = [
  { value: AuthorityType_Enum.Unknown, label: 'All types' },
  ...[
    AuthorityType_Enum.Root,
    AuthorityType_Enum.Intermediate,
    AuthorityType_Enum.Issuing,
    AuthorityType_Enum.Shaken,
    AuthorityType_Enum.ShakenDelegated,
  ].map((value) => ({ value, label: enumName('AuthorityType', value) })),
];

/**
 * The issuers of the org or of the selected project (DESIGN.md section
 * 8.1): ListIssuers with the status and type filters, cursor paging, the
 * labels remembered by IKID for the certificate pages; Register and Import
 * for an Admin
 */
@Component({
  selector: 'app-issuers',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    RouterLink,
    CaUnavailable,
    ColumnDef,
    DataTable,
    EnumNamePipe,
    ExpiresInPipe,
    Icon,
    PageHeading,
    Rfc3339DatePipe,
    ScopeNamePipe,
    StatusChip,
  ],
  templateUrl: './issuers.html',
  styleUrl: '../ca/ca-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Issuers {
  private readonly ca = inject(CA_SERVICE);
  private readonly router = inject(Router);
  protected readonly session = inject(AuthStore);
  protected readonly tenant = inject(TenantStore);
  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly typeFilters = TYPE_FILTERS;
  protected readonly status = signal(IssuerStatus_Enum.Unknown);
  protected readonly type = signal(AuthorityType_Enum.Unknown);
  protected readonly pageSize = signal(25);

  protected readonly issuers = pagedResource<IssuerListParams, Issuer>({
    params: () =>
      this.session.orgId()
        ? {
            projectId: this.tenant.projectId(),
            status: this.status(),
            type: this.type(),
            pageSize: this.pageSize(),
          }
        : undefined,
    loader: async (p, cursor) => {
      const res = await this.ca.listIssuers({
        ProjectID: p.projectId,
        Status: p.status,
        Type: p.type,
        Limit: p.pageSize,
        Cursor: cursor,
      });
      this.tenant.rememberIssuerLabels(
        res.Issuers.filter((i) => i.SKID).map((i) => [i.SKID, i.Label] as const),
      );
      return { items: res.Issuers, next: res.NextPage?.Cursor ?? '' };
    },
  });

  protected readonly unavailable = computed(() => isCaUnavailable(this.issuers.error()));
  protected readonly filtered = computed(
    () => this.status() !== IssuerStatus_Enum.Unknown || this.type() !== AuthorityType_Enum.Unknown,
  );
  protected readonly scopeText = computed(() =>
    this.tenant.projectId()
      ? `the project ${this.tenant.selectionLabel()}`
      : 'the whole organization',
  );
  protected readonly canRegister = computed(() => this.session.can('/pb.CA/RegisterIssuer'));
  protected readonly canImport = computed(() => this.session.can('/pb.CA/ImportIssuer'));
  protected readonly rowId = (i: Issuer): string => i.ID;
  protected readonly statusTone = issuerStatusTone;
  protected readonly expiry = expiryState;

  protected open(issuer: Issuer): void {
    void this.router.navigate(['/issuers', issuer.ID]);
  }

  protected clearFilters(): void {
    this.status.set(IssuerStatus_Enum.Unknown);
    this.type.set(AuthorityType_Enum.Unknown);
  }
}
