import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { log } from 'src/libts/logging';
import { toUiError } from '../../core/api/errors';
import { APP_PLATFORM, APP_USER, AUTH_SERVICE, STORAGE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthLayout } from './auth-layout';

/** The one-time code this page load already exchanged, kept in memory storage */
export const LANDED_CODE = 'landed_code';

/**
 * The landing of the sign-in (DESIGN.md section 4.3): drops the result
 * from the address bar, exchanges the one-time code (bearer) or reads the
 * cookie session, loads the profile and opens the org, the org selection
 * or the notice that fits. A failure returns to the login with the reason.
 */
@Component({
  selector: 'app-authenticated',
  imports: [AuthLayout, MatProgressSpinnerModule],
  template: `<app-auth-layout>
    <span class="login-eyebrow"><span class="status-dot"></span> Signing in</span>
    <h1 class="compact">Authenticated</h1>
    <div class="working" role="status">
      <mat-progress-spinner diameter="22" mode="indeterminate" aria-hidden="true" />
      <span>{{ step() }}</span>
    </div>
  </app-auth-layout>`,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Authenticated implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platform = inject(APP_PLATFORM);
  private readonly storage = inject(STORAGE);
  private readonly user = inject(APP_USER);
  private readonly auth = inject(AUTH_SERVICE);
  private readonly session = inject(AuthStore);

  protected readonly step = signal('Retrieving your profile…');

  ngOnInit(): void {
    void this.land();
  }

  private async land(): Promise<void> {
    const snapshot = this.route.snapshot;
    // the fragment response mode carries the same parameters
    const params = new URLSearchParams(snapshot.fragment ?? '');
    for (const [key, value] of Object.entries(snapshot.queryParams)) {
      params.set(key, String(value));
    }
    // the one-time code leaves the address bar and the history first
    this.platform.replaceHistoryUrl('/auth/authenticated');

    try {
      const error = params.get('error');
      const code = params.get('code');
      if (error) {
        await this.fail(error, params.get('error_description') || '');
        return;
      } else if (code) {
        if (this.storage.memory.getItem(LANDED_CODE) === code) {
          return;
        }
        this.storage.memory.setItem(LANDED_CODE, code);
        const token = await this.auth.exchangeCode(code);
        await this.auth.getUserToken(token.AccessToken);
      } else if (params.get('cookie_set') === 'true') {
        this.user.setCsrfTokenName(params.get('csrf') || '');
        await this.auth.getUserToken();
      } else {
        await this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      this.step.set('Opening your organization…');
      await this.router.navigateByUrl(await this.session.completeSignIn(), { replaceUrl: true });
    } catch (err) {
      log.error('Authenticated: sign-in failed', err);
      const e = toUiError(err);
      await this.fail(e.kind === 'forbidden' ? 'access_denied' : 'server_error', e.detail);
    }
  }

  private async fail(error: string, description: string): Promise<void> {
    this.user.logout();
    await this.router.navigate(['/login'], {
      queryParams: { error, error_description: description || undefined },
      replaceUrl: true,
    });
  }
}
