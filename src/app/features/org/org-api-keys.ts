import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';

/** The API keys tab arrives with the organization administration */
@Component({
  selector: 'app-org-api-keys',
  imports: [EmptyState],
  template: `<section class="panel" aria-labelledby="api-keys-title">
    <header class="panel-header">
      <div>
        <h2 id="api-keys-title">API keys</h2>
        <p>Machine access to the organization and its projects, with scopes and an expiry.</p>
      </div>
      <span class="subtle-tag">Coming soon</span>
    </header>
    <app-empty-state
      icon="key"
      title="API keys will live here"
      description="Creating keys with scopes, a project and an expiry, and deleting them, arrive in a later step."
    />
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgApiKeys {}
