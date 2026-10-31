import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-lookup',
  imports: [EmptyState, PageHeading],
  template: ` <app-page-heading
      title="Lookup"
      description="Find any certificate by serial, key identifier or hash."
    />
    <section class="panel" aria-labelledby="lookup-title">
      <header class="panel-header">
        <div>
          <h2 id="lookup-title">Certificate information</h2>
          <p>
            The public status of a certificate, with its issuer chain and the CRL and OCSP
            endpoints.
          </p>
        </div>
        <span class="subtle-tag">Coming soon</span>
      </header>
      <app-empty-state
        icon="search"
        title="Lookup will live here"
        description="The certificate information service arrives with the certificate pages."
      />
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lookup {}
