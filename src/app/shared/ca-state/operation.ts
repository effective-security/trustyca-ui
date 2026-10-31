import { computed, signal } from '@angular/core';
import { toUiError, UiError } from '../../core/api/errors';

/**
 * One request a form sends, as the template follows it: `busy` while the
 * server answers (the key operations of the CA take seconds and carry the
 * longer deadline), `error` when it refused, for app-request-error next to
 * the form. A new run clears the previous failure.
 */
export class Operation {
  private readonly running = signal(false);
  private readonly failure = signal<UiError | undefined>(undefined);

  readonly busy = this.running.asReadonly();
  readonly error = this.failure.asReadonly();
  /** True when the server answered with a conflict (the backend's 409) */
  readonly conflict = computed(() => this.failure()?.kind === 'conflict');

  /**
   * Runs the request; resolves its answer, or undefined when it failed,
   * with the failure in `error`. A second run while one is in flight is
   * ignored.
   */
  async run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (this.running()) {
      return undefined;
    }
    this.running.set(true);
    this.failure.set(undefined);
    try {
      return await fn();
    } catch (err) {
      this.failure.set(toUiError(err));
      return undefined;
    } finally {
      this.running.set(false);
    }
  }

  reset(): void {
    this.failure.set(undefined);
  }
}
