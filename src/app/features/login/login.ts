import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { PreviewSession } from '../../core/auth/preview-session';
import { Brand } from '../../shared/brand/brand';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-login',
  imports: [MatButtonModule, Brand, Icon],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly session = inject(PreviewSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected login(): void {
    this.session.login();
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    const target =
      requested?.startsWith('/') &&
      !requested.startsWith('//') &&
      requested.split(/[?#]/)[0] !== '/login'
        ? requested
        : '/dashboard';
    void this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
