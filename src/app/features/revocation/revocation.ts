import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-revocation',
  imports: [EmptyState, PageHeading],
  template: ` <app-page-heading
      title="Revocation"
      description="Certificate revocation lists and the certificates on them."
    />
    <section class="panel" aria-labelledby="revocation-title">
      <header class="panel-header">
        <div>
          <h2 id="revocation-title">Revocation lists</h2>
          <p>The CRL of every issuer, its schedule and the revoked certificates.</p>
        </div>
        <span class="subtle-tag">Coming soon</span>
      </header>
      <app-empty-state
        icon="ban"
        title="Revocation will live here"
        description="CRL publication and the revoked certificates arrive with the certificate pages."
      />
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Revocation {}
