import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';
import { downloadText } from '../../shared/files/download';
import { Icon } from '../../shared/icon/icon';
import { PemViewer } from '../../shared/pem-viewer/pem-viewer';
import { IssuerPage } from './issuer-page';

/**
 * The Chain tab: the certificate, the intermediates and the root as PEM
 * with copy and download, the signing request while the issuer is Pending
 */
@Component({
  selector: 'app-issuer-chain',
  imports: [MatButtonModule, Icon, PemViewer],
  template: `@if (page.current(); as i) {
    @if (i.Status === PENDING) {
      <section class="panel" aria-labelledby="csr-title">
        <header class="panel-header">
          <div>
            <h2 id="csr-title">Certificate signing request</h2>
            <p>
              Hand this request to the external authority. The certificate it returns activates the
              issuer.
            </p>
          </div>
        </header>
        <div class="panel-body">
          <app-pem-viewer
            [pem]="i.Csr"
            title="Signing request"
            [fileName]="i.Label + '.csr'"
            class="csr-viewer"
          />
        </div>
      </section>
    }
    <section class="panel" aria-labelledby="chain-title">
      <header class="panel-header">
        <div>
          <h2 id="chain-title">Certificate chain</h2>
          <p>The issuer certificate, the intermediates above it and the root it verifies to.</p>
        </div>
        @if (bundle()) {
          <button mat-stroked-button type="button" class="bundle-button" (click)="downloadBundle()">
            <app-icon name="download" />Download bundle
          </button>
        }
      </header>
      <div class="panel-body chain-viewers">
        <app-pem-viewer
          [pem]="i.Certificate"
          title="Issuer certificate"
          [fileName]="i.Label + '.pem'"
          class="certificate-viewer"
        />
        @if (i.Intermediates) {
          <app-pem-viewer
            [pem]="i.Intermediates"
            title="Intermediates"
            [fileName]="i.Label + '-chain.pem'"
            class="intermediates-viewer"
          />
        }
        <app-pem-viewer
          [pem]="i.Root"
          title="Root"
          [fileName]="i.Label + '-root.pem'"
          class="root-viewer"
        />
      </div>
    </section>
  }`,
  styles: `
    :host {
      display: grid;
      gap: 20px;
    }
    .panel-body {
      padding: 20px 24px 24px;
    }
    .chain-viewers {
      display: grid;
      gap: 16px;
    }
    .bundle-button {
      flex-shrink: 0;
      font-size: 11px;
    }
    .bundle-button app-icon {
      width: 14px;
      height: 14px;
      margin-right: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuerChain {
  protected readonly page = inject(IssuerPage);
  protected readonly PENDING = IssuerStatus_Enum.Pending;

  /** The certificate, the intermediates and the root in one text */
  protected readonly bundle = computed(() => {
    const i = this.page.current();
    return i ? [i.Certificate, i.Intermediates, i.Root].filter(Boolean).join('\n') : '';
  });

  protected downloadBundle(): void {
    const i = this.page.current();
    if (i) {
      downloadText(`${i.Label}-bundle.pem`, this.bundle() + '\n', 'application/x-pem-file');
    }
  }
}
