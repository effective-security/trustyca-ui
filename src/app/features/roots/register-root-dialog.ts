import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RootCertificate, Trust_Enum } from 'src/services/trustyca/protogen/pkix';
import { CA_SERVICE } from '../../core/api/tokens';
import { Operation } from '../../shared/ca-state/operation';
import { wideDialog } from '../../shared/dialog/dialog-config';
import { RequestError } from '../../shared/ca-state/request-error';
import { PemInput } from '../../shared/forms/pem-input';
import { pem } from '../../shared/forms/validators';
import { enumName } from '../../shared/pipes/enum-name.pipe';

/**
 * RegisterRoot: an external trust anchor of the org (a self-signed CA
 * certificate) with its trust scope. Closes with the registered root.
 */
@Component({
  selector: 'app-register-root-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    PemInput,
    RequestError,
  ],
  template: `<h2 mat-dialog-title>Register trust anchor</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="root-form">
        <p class="root-note">
          A self-signed CA certificate your relying parties trust. The roots of the issuers
          registered here are anchors already; this is for an external one.
        </p>
        <app-pem-input
          class="root-input"
          label="Root certificate"
          [control]="form.controls.pem"
          [required]="true"
          expected="CERTIFICATE"
        />
        <mat-form-field appearance="outline">
          <mat-label>Trust</mat-label>
          <mat-select formControlName="trust" class="trust-select">
            @for (t of trusts; track t) {
              <mat-option [value]="t">{{ trustLabel(t) }}</mat-option>
            }
          </mat-select>
          <mat-hint>Private for an enterprise anchor, Public for a publicly trusted one.</mat-hint>
        </mat-form-field>
        <app-request-error [error]="op.error()" context="Could not register the root" />
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close [disabled]="op.busy()">Cancel</button>
        <button mat-flat-button type="submit" class="save-button" [disabled]="op.busy()">
          {{ op.busy() ? 'Registering…' : 'Register' }}
        </button>
      </mat-dialog-actions>
    </form>`,
  styles: `
    .root-form {
      display: grid;
      gap: 6px;
      padding-top: 8px;
    }
    .root-note {
      margin: 0 0 12px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterRootDialog {
  private readonly ref = inject<MatDialogRef<RegisterRootDialog, RootCertificate>>(MatDialogRef);
  private readonly ca = inject(CA_SERVICE);
  protected readonly op = new Operation();
  protected readonly trusts: readonly Trust_Enum[] = [Trust_Enum.Private, Trust_Enum.Public];
  /** Opens the dialog; resolves the registered root, or undefined */
  static open(dialog: MatDialog): Promise<RootCertificate | undefined> {
    const ref = dialog.open<RegisterRootDialog, void, RootCertificate>(
      RegisterRootDialog,
      wideDialog(),
    );
    return firstValueFrom(ref.afterClosed());
  }

  constructor() {
    // a request in flight is not abandoned by Escape or a click outside
    effect(() => {
      this.ref.disableClose = this.op.busy();
    });
  }

  protected readonly form = new FormGroup({
    pem: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, pem({ type: 'CERTIFICATE' })],
    }),
    trust: new FormControl<Trust_Enum>(Trust_Enum.Private, { nonNullable: true }),
  });

  protected trustLabel(t: Trust_Enum): string {
    return enumName('Trust', t);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const created = await this.op.run(() =>
      this.ca.registerRoot({ Pem: v.pem.trim(), Trust: v.trust }),
    );
    if (created) {
      this.ref.close(created);
    }
  }
}
