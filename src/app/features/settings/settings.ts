import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-settings',
  imports: [EmptyState, PageHeading],
  template: ` <app-page-heading
      title="Settings"
      description="Make the console feel like your workspace."
    />
    <section class="panel" aria-labelledby="settings-title">
      <header class="panel-header">
        <div>
          <h2 id="settings-title">Console preferences</h2>
          <p>A foundation for your workspace configuration.</p>
        </div>
        <span class="subtle-tag">Preview</span>
      </header>
      <app-empty-state
        icon="settings"
        title="Your preferences, in one place"
        description="Workspace settings will be available in a future phase. For now, explore the console and its navigation."
      />
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {}
