import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';
import { CA_SERVICE } from '../../core/api/tokens';
import { Operation } from '../../shared/ca-state/operation';
import { RequestError } from '../../shared/ca-state/request-error';
import { Icon } from '../../shared/icon/icon';
import { KvList } from '../../shared/kv-list/kv-list';
import { NotifyService } from '../../shared/notify/notify';
import { IssuerConfigFormFields } from './issuer-config-form';
import {
  configToValues,
  describeConfig,
  issuerConfigForm,
  valuesToConfig,
} from './issuer-config.model';
import { IssuerPage } from './issuer-page';

/**
 * The Configuration tab: the runtime settings of the issuer, edited in
 * place by an Admin and saved with UpdateIssuer{Config} (a key operation:
 * the longer deadline, the refusal next to the form)
 */
@Component({
  selector: 'app-issuer-configuration',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatProgressBarModule,
    Icon,
    IssuerConfigFormFields,
    KvList,
    RequestError,
  ],
  template: `@if (page.current(); as i) {
    <section class="panel" aria-labelledby="config-title">
      <header class="panel-header">
        <div>
          <h2 id="config-title">Runtime settings</h2>
          <p>
            Where the certificates point for the issuer certificate, OCSP and the CRL, how long the
            CRL and OCSP answers live, and which profiles the issuer may sign.
          </p>
        </div>
        @if (editable() && !editing()) {
          <button mat-stroked-button type="button" class="edit-button" (click)="edit()">
            <app-icon name="edit" />Edit
          </button>
        }
      </header>
      @if (editing()) {
        <form class="config-panel" [formGroup]="form" (ngSubmit)="save()">
          <app-issuer-config-form [form]="form" />
          <app-request-error [error]="op.error()" context="Could not save the configuration" />
          @if (op.busy()) {
            <mat-progress-bar mode="indeterminate" aria-label="Saving" />
          }
          <div class="form-actions">
            <button mat-button type="button" [disabled]="op.busy()" (click)="cancel()">
              Cancel
            </button>
            <button mat-flat-button type="submit" class="save-button" [disabled]="op.busy()">
              {{ op.busy() ? 'Saving…' : 'Save configuration' }}
            </button>
          </div>
        </form>
      } @else {
        <app-kv-list [items]="items()" [wide]="true" />
      }
    </section>
  }`,
  styles: `
    :host {
      display: block;
    }
    .config-panel {
      display: grid;
      gap: 8px;
      padding: 20px 24px 24px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .edit-button app-icon {
      width: 15px;
      height: 15px;
      margin-right: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuerConfiguration {
  private readonly ca = inject(CA_SERVICE);
  private readonly notify = inject(NotifyService);
  protected readonly page = inject(IssuerPage);
  protected readonly op = new Operation();
  protected readonly editing = signal(false);
  protected readonly form = issuerConfigForm();
  protected readonly items = computed(() => describeConfig(this.page.current()?.Config));
  /** An Admin configures an issuer that still has a key */
  protected readonly editable = computed(
    () => this.page.canConfigure() && this.page.current()?.Status !== IssuerStatus_Enum.Destroyed,
  );

  constructor() {
    // the issuer changed under the form: start from its settings again
    effect(() => {
      const issuer = this.page.current();
      if (issuer && !this.editing()) {
        this.form.reset(configToValues(issuer.Config));
      }
    });
  }

  protected edit(): void {
    const issuer = this.page.current();
    if (issuer) {
      this.form.reset(configToValues(issuer.Config));
      this.op.reset();
      this.editing.set(true);
    }
  }

  protected cancel(): void {
    this.editing.set(false);
  }

  protected async save(): Promise<void> {
    const issuer = this.page.current();
    if (!issuer) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const updated = await this.op.run(() =>
      this.ca.updateIssuer({
        ID: issuer.ID,
        Config: valuesToConfig(this.form.getRawValue()),
        ProjectID: this.page.scopeOf(issuer),
      }),
    );
    if (updated) {
      this.page.updated(updated);
      this.editing.set(false);
      this.notify.info(`Configuration of ${updated.Label} saved`);
    }
  }
}
