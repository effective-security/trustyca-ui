import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Scope_Enum } from 'src/services/trustyca/protogen/types';
import { getRoleDisplayName } from 'src/services/trustyca/rpc/enums';
import { Membership } from 'src/services/trustyca/protogen/orgs';
import { toUiError } from '../../core/api/errors';
import { ORGS_SERVICE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { PageHeading } from '../../shared/page-heading/page-heading';

/** The profile of the token, the grants in the selected org and the session */
@Component({
  selector: 'app-account',
  imports: [DatePipe, MatButtonModule, PageHeading, RouterLink],
  template: `<app-page-heading
      title="Account"
      description="Your identity in the Trusty CA console."
    />
    <div class="account-grid">
      <section class="panel" aria-labelledby="profile-title">
        <header class="panel-header">
          <div>
            <h2 id="profile-title">Your profile</h2>
            <p>From your identity provider, as the server signed it into your token.</p>
          </div>
        </header>
        <dl class="kv">
          <dt>Name</dt>
          <dd>{{ session.profile().Name }}</dd>
          <dt>Email</dt>
          <dd>
            {{ session.profile().Email }}
            @if (session.profile().EmailVerified) {
              <span class="subtle-tag">verified</span>
            }
          </dd>
          <dt>Signed in with</dt>
          <dd>{{ session.token().Provider || '—' }}</dd>
          <dt>Session</dt>
          <dd>{{ sessionKind() }}</dd>
          <dt>Expires</dt>
          <dd>{{ session.token().ExpiresAt | date: 'medium' }}</dd>
        </dl>
        <div class="panel-actions">
          <button mat-stroked-button type="button" (click)="session.signOut()">Sign out</button>
        </div>
      </section>

      <section class="panel" aria-labelledby="access-title">
        <header class="panel-header">
          <div>
            <h2 id="access-title">{{ orgName() }}</h2>
            <p>Your resolved role and the grants that give it.</p>
          </div>
          <a mat-button routerLink="/auth/select-org">Switch</a>
        </header>
        @if (memberships.hasValue()) {
          @let m = memberships.value();
          <dl class="kv">
            <dt>Role</dt>
            <dd>{{ m.Org ? roleName(m.Org.Role) : session.orgRole() }}</dd>
          </dl>
          <ul class="grants">
            @for (g of m.Memberships; track g.ID) {
              <li>
                <span>{{ scopeName(g) }}</span
                ><span class="subtle-tag">{{ roleName(g.Role) }}</span>
              </li>
            } @empty {
              <li>No explicit grant: your access comes from the org.</li>
            }
          </ul>
        } @else if (memberships.error()) {
          <p class="panel-note" role="alert">{{ error() }}</p>
        } @else {
          <p class="panel-note" role="status">Loading your grants…</p>
        }
      </section>
    </div>`,
  styles: `
    .account-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 32px;
    }
    .kv {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 10px 16px;
      margin: 0;
      padding: 20px 24px;
      font-size: 12px;
    }
    .kv dt {
      color: var(--muted);
    }
    .kv dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .grants {
      list-style: none;
      margin: 0;
      padding: 0 24px 24px;
      display: grid;
      gap: 8px;
      font-size: 12px;
    }
    .grants li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    .panel-actions {
      padding: 0 24px 24px;
    }
    .panel-note {
      padding: 20px 24px;
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  private readonly orgs = inject(ORGS_SERVICE);
  protected readonly session = inject(AuthStore);
  protected readonly memberships = resource({
    params: () => this.session.orgId() || undefined,
    loader: () => this.orgs.getUserMemberships(),
  });
  protected readonly orgName = computed(() => {
    const org = this.memberships.hasValue() ? this.memberships.value().Org : undefined;
    return org?.OrgName || org?.OrgAlias || this.session.org()?.Name || 'Organization';
  });
  protected readonly sessionKind = computed(() =>
    this.session.token().TokenType === 'cookie' ? 'Browser cookie' : 'Bearer token',
  );
  protected readonly error = computed(() => toUiError(this.memberships.error()).detail);

  protected roleName(role: number | string): string {
    return getRoleDisplayName(role);
  }

  protected scopeName(g: Membership): string {
    if (g.Scope === Scope_Enum.Project || g.ProjectID) {
      return `Project ${g.ProjectName || g.ProjectAlias || g.ProjectID}`;
    }
    return 'Organization-wide';
  }
}
