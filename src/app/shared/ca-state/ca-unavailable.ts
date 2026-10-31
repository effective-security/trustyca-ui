import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { toUiError } from '../../core/api/errors';
import { Icon } from '../icon/icon';

/**
 * The "CA service unavailable" state of every CA page (DESIGN.md section
 * 2.1): the wfe could not reach a backend, the next call tries again. The
 * sign-in, the organization pages and the CIS lookup are unaffected, so the
 * shell stays usable around it.
 */
@Component({
  selector: 'app-ca-unavailable',
  imports: [MatButtonModule, Icon],
  template: `<div class="ca-unavailable" role="alert">
    <span class="ca-unavailable-icon"><app-icon name="warning" /></span>
    <h3>CA service unavailable</h3>
    <p>
      The certification authority did not answer. The console keeps working, and the next call tries
      again.
    </p>
    @if (detail()) {
      <p class="ca-unavailable-detail">{{ detail() }}</p>
    }
    <button mat-stroked-button type="button" class="retry-button" (click)="retry.emit()">
      <app-icon name="refresh" />Try again
    </button>
  </div>`,
  styles: `
    .ca-unavailable {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 56px 24px 64px;
    }
    .ca-unavailable-icon {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: #fcf1e6;
      border: 1px solid #efd3b8;
      color: #c8743a;
      margin-bottom: 18px;
    }
    .ca-unavailable-icon app-icon {
      width: 26px;
      height: 26px;
    }
    h3 {
      margin: 0 0 8px;
      font-size: 15px;
      font-weight: 550;
    }
    p {
      max-width: 420px;
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.8;
    }
    .ca-unavailable-detail {
      margin-top: 8px;
      font-family: var(--mono);
      font-size: 11px;
    }
    .retry-button {
      margin-top: 22px;
      font-size: 11px;
    }
    .retry-button app-icon {
      width: 15px;
      height: 15px;
      margin-right: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaUnavailable {
  /** The failure, for the server's text */
  readonly error = input<unknown>(undefined);
  readonly retry = output<void>();

  protected readonly detail = computed(() => {
    const err = this.error();
    return err === undefined || err === null ? '' : toUiError(err).detail;
  });
}
