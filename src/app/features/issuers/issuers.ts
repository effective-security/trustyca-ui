import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-issuers',
  imports: [EmptyState, PageHeading],
  template: ` <app-page-heading
      title="Issuers"
      description="The signing authorities behind your chain of trust."
    />
    <section class="panel" aria-labelledby="issuers-title">
      <header class="panel-header">
        <div>
          <h2 id="issuers-title">Certificate issuers</h2>
          <p>Your root and intermediate signing authorities.</p>
        </div>
        <span class="subtle-tag">Coming soon</span>
      </header>
      <app-empty-state
        icon="layers"
        title="Your issuers will live here"
        description="Connect your certification authority to view and manage its issuers. This workspace is ready for the next step."
      />
      <div class="panel-footnote">
        Issuer management will be available when your authority is connected.
      </div>
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Issuers {}
