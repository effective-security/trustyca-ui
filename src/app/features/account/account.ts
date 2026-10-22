import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PageHeading } from '../../shared/page-heading/page-heading';

@Component({
  selector: 'app-account',
  imports: [EmptyState, PageHeading],
  template: ` <app-page-heading
      title="Account"
      description="Your identity in the Trusty CA workspace."
    />
    <section class="panel" aria-labelledby="account-title">
      <header class="panel-header">
        <div>
          <h2 id="account-title">Your profile</h2>
          <p>Preview user · Local workspace</p>
        </div>
        <span class="subtle-tag">Preview</span>
      </header>
      <app-empty-state
        icon="user"
        title="A space for your account"
        description="Profile details and account management will be available when sign-in is connected. You are currently exploring with preview access."
      />
    </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {}
