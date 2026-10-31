import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-profiles',
  imports: [EmptyState, PageHeading],
  template: ` <app-page-heading
      title="Profiles"
      description="The templates every certificate is issued from."
    />
    <section class="panel" aria-labelledby="profiles-title">
      <header class="panel-header">
        <div>
          <h2 id="profiles-title">Certificate profiles</h2>
          <p>Key usages, extensions, validity and policies per kind of certificate.</p>
        </div>
        <span class="subtle-tag">Coming soon</span>
      </header>
      <app-empty-state
        icon="document"
        title="Your profiles will live here"
        description="Profile management arrives with the certificate authority pages. Until then the server's templates apply."
      />
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profiles {}
