import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon/icon';
import { KvItem, KvList } from '../../shared/kv-list/kv-list';
import { enumName } from '../../shared/pipes/enum-name.pipe';
import { formatFingerprint } from '../../shared/pipes/fingerprint.pipe';
import { expiresIn, formatTime } from '../../shared/pipes/time';
import { TenantStore } from '../../core/tenant/tenant.store';
import { IssuerPage } from './issuer-page';

/** The Overview tab: the identity, the validity, the key and the lifecycle of the issuer */
@Component({
  selector: 'app-issuer-overview',
  imports: [MatButtonModule, RouterLink, Icon, KvList],
  template: `@if (page.current(); as i) {
    <section class="panel" aria-labelledby="identity-title">
      <header class="panel-header">
        <div>
          <h2 id="identity-title">Identity</h2>
          <p>The certificate of the issuer and the key behind it.</p>
        </div>
        @if (i.ParentID) {
          <a mat-stroked-button class="parent-link" [routerLink]="['/issuers', i.ParentID]">
            <app-icon name="link" />{{ parentLabel() }}
          </a>
        }
      </header>
      <app-kv-list [items]="identity()" [wide]="true" />
    </section>
    <section class="panel" aria-labelledby="lifecycle-title">
      <header class="panel-header">
        <div>
          <h2 id="lifecycle-title">Lifecycle</h2>
          <p>The scope, the status and the timestamps of the issuer record.</p>
        </div>
      </header>
      <app-kv-list [items]="lifecycle()" [wide]="true" />
    </section>
  }`,
  styles: `
    :host {
      display: grid;
      gap: 20px;
    }
    .parent-link {
      flex-shrink: 0;
      font-size: 11px;
    }
    .parent-link app-icon {
      width: 14px;
      height: 14px;
      margin-right: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuerOverview {
  protected readonly page = inject(IssuerPage);
  private readonly tenant = inject(TenantStore);

  protected readonly identity = computed<KvItem[]>(() => {
    const i = this.page.current();
    if (!i) {
      return [];
    }
    const validity = i.NotAfter ? `${formatTime(i.NotBefore)} to ${formatTime(i.NotAfter)}` : '';
    return [
      { key: 'Subject', value: i.Subject, mono: true, empty: 'Not issued yet' },
      { key: 'Issuer', value: i.Issuer, mono: true, empty: 'Not issued yet' },
      { key: 'Serial number', value: i.SerialNumber, mono: true, empty: 'Not issued yet' },
      { key: 'Subject key ID', value: formatFingerprint(i.SKID), mono: true },
      {
        key: 'Issuer key ID',
        value: formatFingerprint(i.IKID),
        mono: true,
        empty: 'Not issued yet',
      },
      { key: 'SHA-256', value: formatFingerprint(i.Sha256), mono: true, empty: 'Not issued yet' },
      {
        key: 'Validity',
        value: validity ? `${validity} (${expiresIn(i.NotAfter)})` : '',
        empty: 'Not issued yet',
      },
      { key: 'Key provider', value: i.KeyProvider, empty: 'Server default' },
    ];
  });

  protected readonly lifecycle = computed<KvItem[]>(() => {
    const i = this.page.current();
    if (!i) {
      return [];
    }
    return [
      { key: 'ID', value: i.ID, mono: true },
      { key: 'Type', value: enumName('AuthorityType', i.Type) },
      { key: 'Status', value: enumName('IssuerStatus', i.Status) },
      { key: 'Scope', value: this.tenant.scopeLabel(i.ProjectID) },
      {
        key: 'Parent issuer',
        value: i.ParentID,
        mono: true,
        empty: 'None: self-signed or externally signed',
      },
      { key: 'Last CRL number', value: i.CrlNumber, empty: 'No CRL published yet' },
      { key: 'Created', value: formatTime(i.CreatedAt) },
      { key: 'Updated', value: formatTime(i.UpdatedAt) },
    ];
  });

  /** 'Signed by <label>' when the list remembered the parent (the IKID of the issuer is its parent's SKID) */
  protected readonly parentLabel = computed(() => {
    const i = this.page.current();
    const label = i?.ParentID ? this.tenant.issuerLabel(i.IKID) : undefined;
    return label ? `Signed by ${label}` : 'Signed by its parent issuer';
  });
}
