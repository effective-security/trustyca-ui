import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon/icon';
import { IssuerPage } from './issuer-page';

/**
 * The Profiles tab: the profiles bound to the issuer by their issuer label,
 * and the ones bound to any issuer that its configuration allows; each
 * links to the profile pages
 */
@Component({
  selector: 'app-issuer-profiles',
  imports: [RouterLink, Icon],
  template: `@if (page.current(); as i) {
    <section class="panel" aria-labelledby="bound-title">
      <header class="panel-header">
        <div>
          <h2 id="bound-title">Profiles bound to this issuer</h2>
          <p>Certificate profiles whose issuer label names {{ i.Label }}.</p>
        </div>
      </header>
      @if (i.Profiles.length > 0) {
        <ul class="profile-list">
          @for (label of i.Profiles; track label) {
            <li>
              <a [routerLink]="['/profiles']" [queryParams]="{ label }"
                ><app-icon name="document" />{{ label }}</a
              >
            </li>
          }
        </ul>
      } @else {
        <p class="panel-note">No profile is bound to this issuer yet.</p>
      }
    </section>
    <section class="panel" aria-labelledby="allowed-title">
      <header class="panel-header">
        <div>
          <h2 id="allowed-title">Allowed profiles</h2>
          <p>
            Profiles bound to any issuer (issuer label *) that this issuer may sign, from its
            configuration.
          </p>
        </div>
      </header>
      @if (allowed().length > 0) {
        <ul class="profile-list">
          @for (label of allowed(); track label) {
            <li>
              <a [routerLink]="['/profiles']" [queryParams]="{ label }"
                ><app-icon name="document" />{{ label }}</a
              >
            </li>
          }
        </ul>
      } @else {
        <p class="panel-note">
          None. Only the profiles bound to this issuer can be signed with it; the Configuration tab
          sets the allowed profiles.
        </p>
      }
    </section>
  }`,
  styles: `
    :host {
      display: grid;
      gap: 20px;
    }
    .profile-list {
      list-style: none;
      margin: 0;
      padding: 16px 24px 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .profile-list a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid var(--border);
      border-radius: 999px;
      font-size: 12px;
      color: var(--ink);
      text-decoration: none;
      background: #f6f8f3;
    }
    .profile-list a:hover {
      border-color: #a7bfa8;
    }
    .profile-list app-icon {
      width: 14px;
      height: 14px;
      color: var(--muted);
    }
    .panel-note {
      margin: 0;
      padding: 20px 24px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuerProfiles {
  protected readonly page = inject(IssuerPage);
  protected readonly allowed = computed(() => this.page.current()?.Config?.AllowedProfiles ?? []);
}
