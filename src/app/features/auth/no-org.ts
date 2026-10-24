import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { toUiError } from '../../core/api/errors';
import { AuthStore } from '../../core/auth/auth.store';
import { Icon } from '../../shared/icon/icon';
import { AuthLayout } from './auth-layout';

/** A signed-in user without an accessible org: an administrator has to invite them */
@Component({
  selector: 'app-no-org',
  imports: [AuthLayout, Icon, MatButtonModule],
  template: `<app-auth-layout>
    <span class="login-eyebrow"
      ><span class="status-dot"></span> {{ session.profile().Email }}</span
    >
    <h1 class="compact">No organization yet</h1>
    <p class="login-description">
      You are signed in, but no organization has granted you access. Ask an administrator of your
      organization to invite {{ session.profile().Email || 'your address' }}, then check again.
    </p>
    @if (failure()) {
      <div class="notice error" role="alert">
        <app-icon name="lock" /><span>{{ failure() }}</span>
      </div>
    }
    <div class="actions">
      <button mat-flat-button type="button" [disabled]="checking()" (click)="checkAgain()">
        {{ checking() ? 'Checking…' : 'Check again' }}
      </button>
      <button mat-button type="button" (click)="session.signOut()">Sign out</button>
    </div>
  </app-auth-layout>`,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoOrg {
  private readonly router = inject(Router);
  protected readonly session = inject(AuthStore);
  protected readonly checking = signal(false);
  protected readonly failure = signal('');

  protected async checkAgain(): Promise<void> {
    this.checking.set(true);
    this.failure.set('');
    try {
      const route = await this.session.noOrgRoute();
      if (route === '/auth/noorg') {
        this.failure.set('Still no organization: the invitation has not been accepted yet.');
      } else {
        await this.router.navigateByUrl(route);
      }
    } catch (err) {
      this.failure.set(toUiError(err).detail);
    } finally {
      this.checking.set(false);
    }
  }
}
