import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Issuer } from 'src/services/trustyca/protogen/pkix';
import { CA_SERVICE } from '../../core/api/tokens';
import { Operation } from '../../shared/ca-state/operation';
import { wideDialog } from '../../shared/dialog/dialog-config';
import { RequestError } from '../../shared/ca-state/request-error';
import { PemInput } from '../../shared/forms/pem-input';
import { pem } from '../../shared/forms/validators';

export interface ActivateIssuerData {
  readonly issuer: Issuer;
}

/**
 * ActivateIssuer for a Pending issuer: the certificate the external
 * authority signed for its key, the intermediates and the root it verifies
 * to. A key operation: the longer deadline, a progress state, the server's
 * refusal (a certificate for another key, a chain that does not verify)
 * next to the form. Closes with the activated issuer.
 */
@Component({
  selector: 'app-activate-issuer-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressBarModule,
    PemInput,
    RequestError,
  ],
  template: `<h2 mat-dialog-title>Activate {{ data.issuer.Label }}</h2>
    <form [formGroup]="form" (ngSubmit)="activate()">
      <mat-dialog-content class="activate-form">
        <p class="activate-note">
          Paste the certificate signed for the key of this issuer, the intermediate certificates
          between it and the root, and the root it verifies to. The server checks that the
          certificate is for the key of the signing request.
        </p>
        <app-pem-input
          class="certificate-input"
          label="Issuer certificate"
          [control]="form.controls.certificate"
          [required]="true"
          expected="CERTIFICATE"
          hint="The certificate the external authority issued for the signing request."
        />
        <app-pem-input
          class="intermediates-input"
          label="Intermediate certificates"
          [control]="form.controls.intermediates"
          [multiple]="true"
          expected="CERTIFICATE"
          [rows]="4"
          hint="Optional: the CA certificates between the issuer and the root, in order."
        />
        <app-pem-input
          class="root-input"
          label="Root certificate"
          [control]="form.controls.root"
          expected="CERTIFICATE"
          [rows]="4"
          hint="Optional when the intermediates lead to a known anchor."
        />
        <app-request-error [error]="op.error()" context="Could not activate the issuer" />
        @if (op.busy()) {
          <mat-progress-bar mode="indeterminate" aria-label="Activating" />
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close [disabled]="op.busy()">Cancel</button>
        <button mat-flat-button type="submit" class="activate-submit" [disabled]="op.busy()">
          {{ op.busy() ? 'Activating…' : 'Activate issuer' }}
        </button>
      </mat-dialog-actions>
    </form>`,
  styles: `
    .activate-form {
      display: grid;
      gap: 6px;
      padding-top: 8px;
    }
    .activate-note {
      margin: 0 0 12px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--muted);
    }
    mat-progress-bar {
      margin-top: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivateIssuerDialog {
  protected readonly data = inject<ActivateIssuerData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ActivateIssuerDialog, Issuer>>(MatDialogRef);
  private readonly ca = inject(CA_SERVICE);
  protected readonly op = new Operation();
  /** Opens the dialog for the issuer; resolves the activated issuer, or undefined */
  static open(dialog: MatDialog, issuer: Issuer): Promise<Issuer | undefined> {
    const ref = dialog.open<ActivateIssuerDialog, ActivateIssuerData, Issuer>(
      ActivateIssuerDialog,
      wideDialog<ActivateIssuerData>({ issuer }),
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
    certificate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, pem({ type: 'CERTIFICATE' })],
    }),
    intermediates: new FormControl('', {
      nonNullable: true,
      validators: [pem({ type: 'CERTIFICATE', multiple: true })],
    }),
    root: new FormControl('', { nonNullable: true, validators: [pem({ type: 'CERTIFICATE' })] }),
  });

  protected async activate(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const activated = await this.op.run(() =>
      this.ca.activateIssuer({
        ID: this.data.issuer.ID,
        Certificate: v.certificate.trim(),
        Intermediates: v.intermediates.trim(),
        Root: v.root.trim(),
        ProjectID: this.data.issuer.ProjectID,
      }),
    );
    if (activated) {
      this.ref.close(activated);
    }
  }
}
