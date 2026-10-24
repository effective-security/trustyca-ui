import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { Icon } from '../../shared/icon/icon';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-certificates',
  imports: [MatButtonModule, RouterLink, EmptyState, Icon, PageHeading],
  template: ` <app-page-heading
      title="Certificates"
      description="A home for every certificate in your infrastructure."
    />
    <section class="panel" aria-labelledby="certificates-title">
      <header class="panel-header">
        <div>
          <h2 id="certificates-title">Certificate inventory</h2>
          <p>Visibility across your certificate lifecycle.</p>
        </div>
        <span class="subtle-tag">Coming soon</span>
      </header>
      <app-empty-state
        icon="certificate"
        title="Your certificate inventory starts here"
        description="Once your authority is connected, this space will bring your certificates and their issuers into view."
      >
        <a mat-stroked-button routerLink="/issuers">Explore issuers <app-icon name="arrow" /></a>
      </app-empty-state>
      <div class="panel-footnote">
        Certificate management will be available when your authority is connected.
      </div>
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Certificates {}
