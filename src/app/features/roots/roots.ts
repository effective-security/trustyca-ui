import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-roots',
  imports: [EmptyState, PageHeading],
  template: ` <app-page-heading
      title="Trust anchors"
      description="The root certificates your relying parties trust."
    />
    <section class="panel" aria-labelledby="roots-title">
      <header class="panel-header">
        <div>
          <h2 id="roots-title">Root certificates</h2>
          <p>The anchors of the organization and of the platform.</p>
        </div>
        <span class="subtle-tag">Coming soon</span>
      </header>
      <app-empty-state
        icon="anchor"
        title="Your trust anchors will live here"
        description="The root certificates of the organization and the platform roots arrive with the issuer pages."
      />
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Roots {}
