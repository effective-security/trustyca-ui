import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/empty-state/empty-state';

/** The Members tab: memberships and invites arrive with the organization administration */
@Component({
  selector: 'app-org-members',
  imports: [EmptyState],
  template: `<section class="panel" aria-labelledby="members-title">
    <header class="panel-header">
      <div>
        <h2 id="members-title">Members</h2>
        <p>The members and the pending invites of the organization, with their scope and role.</p>
      </div>
      <span class="subtle-tag">Coming soon</span>
    </header>
    <app-empty-state
      icon="users"
      title="Members will live here"
      description="Adding members, changing roles and managing invites arrive in a later step. Your own grants are on the Account page."
    />
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgMembers {}
