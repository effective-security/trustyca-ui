import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { toUiError, UiError } from '../../core/api/errors';

/** The snackbars of the console: a confirmation, or a UiError with Retry */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);

  /** A short confirmation of what just happened */
  info(message: string): void {
    this.snackBar.open(message, undefined, { duration: 4000 });
  }

  /**
   * Shows a failure as the console describes it (DESIGN.md section 10.4);
   * resolves true when the user asked to retry. A refused session is not
   * shown: the shell already says it.
   */
  async error(err: unknown, context?: string): Promise<boolean> {
    const ui: UiError = toUiError(err);
    if (ui.kind === 'unauthenticated') {
      return false;
    }
    const title = context ? `${context}: ${ui.title.toLowerCase()}` : ui.title;
    const message = ui.detail && ui.detail !== ui.title ? `${title}. ${ui.detail}` : title;
    const ref = this.snackBar.open(message, ui.retry ? 'Retry' : 'Dismiss', {
      duration: ui.retry ? 12_000 : 8_000,
      panelClass: 'error-snackbar',
    });
    const dismissed = await firstValueFrom(ref.afterDismissed());
    return ui.retry && dismissed.dismissedByAction;
  }
}
