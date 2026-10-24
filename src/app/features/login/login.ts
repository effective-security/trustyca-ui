import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { toUiError } from '../../core/api/errors';
import { APP_PLATFORM, AUTH_SERVICE, STORAGE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { safeReturnUrl } from '../../core/auth/return-url';
import { Icon } from '../../shared/icon/icon';
import { AuthLayout } from '../auth/auth-layout';

/** The landing route the server redirects to after the identity provider */
export const AUTH_LANDING_ROUTE = '/auth/authenticated';

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  gitlab: 'GitLab',
  local: 'a local account',
};

/** The texts of the OAuth error codes the server lands with (RFC 6749 section 4.1.2.1) */
const OAUTH_ERRORS: Record<string, string> = {
  access_denied: 'The sign-in was refused.',
  invalid_request: 'The sign-in request was not accepted.',
  unauthorized_client: 'The console is not allowed to sign in here.',
  server_error: 'The server could not complete the sign-in.',
  temporarily_unavailable: 'The sign-in service is temporarily unavailable. Try again in a moment.',
};

interface Notice {
  readonly text: string;
  readonly error: boolean;
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayout,
    Icon,
  ],
  templateUrl: './login.html',
  styleUrl: '../auth/auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AUTH_SERVICE);
  private readonly storage = inject(STORAGE);
  private readonly platform = inject(APP_PLATFORM);
  private readonly session = inject(AuthStore);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  protected readonly email = new FormControl(this.storage.getLoginEmail(), {
    nonNullable: true,
    validators: [Validators.email],
  });
  protected readonly rememberMe = new FormControl(this.storage.getRememberUser(), {
    nonNullable: true,
  });
  protected readonly form = new FormGroup({ email: this.email, rememberMe: this.rememberMe });
  /** The provider whose sign-in is starting, 'email' for the email flow */
  protected readonly busy = signal<string | null>(null);
  protected readonly failure = signal('');
  protected readonly providers = resource({ loader: () => this.auth.getProviders() });
  protected readonly providerNames = computed(() =>
    this.providers.hasValue() ? this.providers.value().ProviderNames : [],
  );

  protected readonly notice = computed<Notice | null>(() => {
    const failure = this.failure();
    if (failure) {
      return { text: failure, error: true };
    }
    const q = this.query();
    const error = q.get('error');
    if (error) {
      return {
        text: q.get('error_description') || OAUTH_ERRORS[error] || 'The sign-in failed.',
        error: true,
      };
    }
    if (this.session.sessionExpired()) {
      return { text: 'Your session has expired. Sign in again to continue.', error: false };
    }
    return null;
  });

  protected providerLabel(name: string): string {
    return PROVIDER_LABELS[name] ?? name;
  }

  /** Finds the provider of the email domain and signs in as that address */
  protected async continueWithEmail(): Promise<void> {
    const email = this.email.value.trim();
    if (!email || this.email.invalid) {
      this.failure.set('Enter your email address, or choose a sign-in provider below.');
      return;
    }
    this.busy.set('email');
    this.failure.set('');
    try {
      const res = await this.auth.getProviders(email);
      const provider = res.ProviderNames[0];
      if (!provider) {
        throw new Error(`No sign-in provider is configured for ${email}.`);
      }
      await this.start(provider, email);
    } catch (err) {
      this.fail(err);
    }
  }

  /** Signs in with a provider; the `local` provider signs in the typed address */
  protected async signInWith(provider: string): Promise<void> {
    this.busy.set(provider);
    this.failure.set('');
    const email = this.email.valid ? this.email.value.trim() : '';
    try {
      await this.start(provider, provider === 'local' ? email : undefined, email);
    } catch (err) {
      this.fail(err);
    }
  }

  private async start(provider: string, email?: string, loginHint?: string): Promise<void> {
    const rememberMe = this.rememberMe.value;
    this.storage.setRememberUser(rememberMe, rememberMe ? this.email.value.trim() : '');
    this.storage.setAfterAuthRoute(safeReturnUrl(this.query().get('returnUrl')));
    const url = await this.auth.authorizeUrl({
      provider,
      email,
      loginHint,
      rememberMe,
      redirectUri: this.platform.locationUrl + AUTH_LANDING_ROUTE,
    });
    this.platform.redirect(url);
  }

  private fail(err: unknown): void {
    this.failure.set(toUiError(err).detail);
    this.busy.set(null);
  }
}
