import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { toUiError, UiError } from '../../core/api/errors';
import { Icon } from '../icon/icon';

/**
 * A failed request next to the form that sent it (DESIGN.md section 10.4):
 * a conflict (the backend's 409: a label in use, an inactive parent, a
 * profile the parent does not allow) is a notice with the server's text,
 * an unreachable CA offers to try again, anything else is an error with the
 * server's text and the correlation ID when the server sent one.
 */
@Component({
  selector: 'app-request-error',
  imports: [MatButtonModule, Icon],
  template: `@if (ui(); as err) {
    <div class="request-error kind-{{ err.kind }}" role="alert">
      <app-icon [name]="err.kind === 'conflict' ? 'info' : 'warning'" />
      <div class="request-error-text">
        <strong>{{ heading() }}</strong>
        @if (err.detail && err.detail !== err.title) {
          <p>{{ err.detail }}</p>
        }
        @if (err.correlationId) {
          <small>Correlation ID {{ err.correlationId }}</small>
        }
      </div>
      @if (err.retry) {
        <button mat-button type="button" class="retry-button" (click)="retry.emit()">
          Try again
        </button>
      }
    </div>
  }`,
  styles: `
    .request-error {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid #ecc9c6;
      background: #fbeeec;
      color: #8a2f29;
      font-size: 12px;
      line-height: 1.6;
    }
    .request-error > app-icon {
      width: 18px;
      height: 18px;
      margin-top: 1px;
    }
    .request-error-text {
      flex: 1;
      min-width: 0;
    }
    .request-error-text p {
      margin: 2px 0 0;
      overflow-wrap: anywhere;
    }
    .request-error-text small {
      display: block;
      margin-top: 4px;
      font-family: var(--mono);
      font-size: 10px;
      opacity: 0.8;
    }
    .kind-conflict {
      border-color: #ecdcb4;
      background: #fbf5e6;
      color: #7a5a16;
    }
    .kind-ca-unavailable,
    .kind-unavailable {
      border-color: #efd3b8;
      background: #fcf1e6;
      color: #86481b;
    }
    .retry-button {
      flex-shrink: 0;
      font-size: 11px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestError {
  /** The failure: a UiError, an RpcError or anything thrown; nothing renders for undefined */
  readonly error = input<unknown>(undefined);
  /** What the request was for: "Could not register the issuer" */
  readonly context = input('');
  readonly retry = output<void>();

  protected readonly ui = computed<UiError | undefined>(() => {
    const err = this.error();
    if (err === undefined || err === null) {
      return undefined;
    }
    return isUiError(err) ? err : toUiError(err);
  });
  protected readonly heading = computed(() => {
    const err = this.ui();
    if (!err) {
      return '';
    }
    if (err.kind === 'conflict') {
      return this.context() ? `${this.context()}: the server refused the request` : err.title;
    }
    return this.context() ? `${this.context()}: ${err.title.toLowerCase()}` : err.title;
  });
}

function isUiError(value: unknown): value is UiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'title' in value &&
    'detail' in value &&
    'retry' in value
  );
}
