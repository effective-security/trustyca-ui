import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { RootCertificate } from 'src/services/trustyca/protogen/pkix';
import { isCaUnavailable } from 'src/services/trustyca/rpc/errors';
import { pagedResource } from '../../core/api/paged-resource';
import { CA_SERVICE, CIS_SERVICE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { CaUnavailable } from '../../shared/ca-state/ca-unavailable';
import { ColumnDef } from '../../shared/data-table/column';
import { DataTable } from '../../shared/data-table/data-table';
import { downloadText } from '../../shared/files/download';
import { Icon } from '../../shared/icon/icon';
import { PageHeading } from '../../shared/page-heading/page-heading';
import { PemDialogService } from '../../shared/pem-viewer/pem-dialog';
import { ExpiresInPipe, Rfc3339DatePipe } from '../../shared/pipes/date.pipes';
import { EnumNamePipe } from '../../shared/pipes/enum-name.pipe';
import { FingerprintPipe, formatFingerprint } from '../../shared/pipes/fingerprint.pipe';
import { expiryState } from '../../shared/pipes/time';
import { NotifyService } from '../../shared/notify/notify';
import { StatusChip } from '../../shared/status-chip/status-chip';
import { RegisterRootDialog } from './register-root-dialog';

/** The page size of ListRoots */
const ROOT_PAGE_SIZE = 50;

/**
 * The trust anchors (DESIGN.md section 8.2): the roots of the org
 * (CA.ListRoots, RegisterRoot for an Admin) and the roots of the platform
 * (CIS.GetRoots without an org), with their PEM to view and download
 */
@Component({
  selector: 'app-roots',
  imports: [
    MatButtonModule,
    CaUnavailable,
    ColumnDef,
    DataTable,
    EnumNamePipe,
    ExpiresInPipe,
    FingerprintPipe,
    Icon,
    PageHeading,
    Rfc3339DatePipe,
    StatusChip,
  ],
  templateUrl: './roots.html',
  styleUrl: '../ca/ca-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Roots {
  private readonly ca = inject(CA_SERVICE);
  private readonly cis = inject(CIS_SERVICE);
  private readonly dialog = inject(MatDialog);
  private readonly pemDialog = inject(PemDialogService);
  private readonly notify = inject(NotifyService);
  protected readonly session = inject(AuthStore);

  /** The anchors of the org */
  protected readonly orgRoots = pagedResource<{ orgId: string }, RootCertificate>({
    params: () => (this.session.orgId() ? { orgId: this.session.orgId() } : undefined),
    loader: async (_p, cursor) => {
      const res = await this.ca.listRoots({ Limit: ROOT_PAGE_SIZE, Cursor: cursor });
      return { items: res.Roots, next: res.NextPage?.Cursor ?? '' };
    },
  });
  protected readonly unavailable = computed(() => isCaUnavailable(this.orgRoots.error()));

  /** The anchors of the platform, public to every caller */
  protected readonly platformRoots = resource({ loader: () => this.cis.getRoots('') });
  protected readonly platformRows = computed(() =>
    this.platformRoots.hasValue() ? this.platformRoots.value().Roots : [],
  );

  protected readonly canRegister = computed(() => this.session.can('/pb.CA/RegisterRoot'));
  protected readonly rowId = (r: RootCertificate): string => r.ID;
  protected readonly expiry = expiryState;

  protected async register(): Promise<void> {
    const created = await RegisterRootDialog.open(this.dialog);
    if (created) {
      this.orgRoots.reload();
      this.notify.info(`Trust anchor ${created.Subject} registered`);
    }
  }

  protected view(root: RootCertificate): void {
    this.pemDialog.open({
      title: root.Subject,
      subtitle: `SHA-256 ${formatFingerprint(root.Sha256)}`,
      pem: root.Pem,
      fileName: this.fileName(root),
    });
  }

  protected download(root: RootCertificate): void {
    downloadText(this.fileName(root), root.Pem + '\n', 'application/x-pem-file');
  }

  /** '<common name>.pem', or the ID of the root when the subject has no CN */
  private fileName(root: RootCertificate): string {
    const cn = /CN=((?:\\.|[^,])+)/.exec(root.Subject)?.[1].replace(/\\(.)/g, '$1');
    const base = (cn ?? root.ID ?? '').trim().replace(/[^A-Za-z0-9._-]+/g, '-') || 'root';
    return base.toLowerCase() + '.pem';
  }
}
