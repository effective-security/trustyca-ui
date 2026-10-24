import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthLayout } from './auth-layout';

/** An org is selected, but the caller scope resolves no role in it */
@Component({
  selector: 'app-no-role',
  imports: [AuthLayout, MatButtonModule, RouterLink],
  template: `<app-auth-layout>
    <span class="login-eyebrow"
      ><span class="status-dot"></span> {{ session.profile().Email }}</span
    >
    <h1 class="compact">No access in this organization</h1>
    <p class="login-description">
      Your account has no role in this organization that opens the console. Ask an administrator to
      grant you a role, or switch to another organization.
    </p>
    <div class="actions">
      <a mat-flat-button routerLink="/auth/select-org">Switch organization</a>
      <button mat-button type="button" (click)="session.signOut()">Sign out</button>
    </div>
  </app-auth-layout>`,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoRole {
  protected readonly session = inject(AuthStore);
}
