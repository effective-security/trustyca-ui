import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { AuthorityType_Enum } from 'src/services/trustyca/protogen/pkix';
import { CA_SERVICE } from '../../core/api/tokens';
import { TenantStore } from '../../core/tenant/tenant.store';
import { Operation } from '../../shared/ca-state/operation';
import { RequestError } from '../../shared/ca-state/request-error';
import { PemInput } from '../../shared/forms/pem-input';
import { textControl } from '../../shared/forms/controls';
import { pem } from '../../shared/forms/validators';
import { Icon } from '../../shared/icon/icon';
import { NotifyService } from '../../shared/notify/notify';
import { PageHeading } from '../../shared/page-heading/page-heading';
import { IssuerConfigFormFields } from './issuer-config-form';
import { issuerConfigForm, valuesToConfig } from './issuer-config.model';
import { ISSUER_TYPES } from './register-issuer.model';

export type KeyMode = 'uri' | 'pem';

/** A private key of any flavour: one PEM block whose type ends with PRIVATE KEY */
const PRIVATE_KEY = pem({ typeSuffix: 'PRIVATE KEY' });

/**
 * ImportIssuer (DESIGN.md section 8.1): an existing CA with its certificate,
 * its chain and its key, as a reference into a crypto provider or as PEM
 * that the server stores wrapped. The key PEM is sent once and never kept
 * by the console.
 */
@Component({
  selector: 'app-import-issuer',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    RouterLink,
    Icon,
    IssuerConfigFormFields,
    PageHeading,
    PemInput,
    RequestError,
  ],
  templateUrl: './import-issuer.html',
  styleUrl: '../ca/ca-pages.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportIssuer {
  private readonly ca = inject(CA_SERVICE);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);
  protected readonly tenant = inject(TenantStore);
  protected readonly types = ISSUER_TYPES;
  protected readonly op = new Operation();
  protected readonly form = new FormGroup({
    projectId: textControl(this.tenant.projectId()),
    label: textControl('', [
      Validators.required,
      Validators.maxLength(64),
      Validators.pattern(/^\S+$/),
    ]),
    type: new FormControl<AuthorityType_Enum>(AuthorityType_Enum.Issuing, {
      nonNullable: true,
      validators: [Validators.min(1)],
    }),
    certificate: textControl('', [Validators.required, pem({ type: 'CERTIFICATE' })]),
    intermediates: textControl('', [pem({ type: 'CERTIFICATE', multiple: true })]),
    root: textControl('', [pem({ type: 'CERTIFICATE' })]),
    keyMode: new FormControl<KeyMode>('uri', { nonNullable: true }),
    keyUri: textControl('', [Validators.required]),
    keyPem: textControl('', [PRIVATE_KEY]),
  });
  protected readonly configForm = issuerConfigForm();
  protected readonly keyMode = toSignal(this.form.controls.keyMode.valueChanges, {
    initialValue: this.form.controls.keyMode.value,
  });

  constructor() {
    // the key the mode names is the required one
    effect(() => {
      const mode = this.keyMode();
      const { keyUri, keyPem } = this.form.controls;
      keyUri.setValidators(mode === 'uri' ? [Validators.required] : []);
      keyPem.setValidators(mode === 'pem' ? [Validators.required, PRIVATE_KEY] : [PRIVATE_KEY]);
      keyUri.updateValueAndValidity();
      keyPem.updateValueAndValidity();
    });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.configForm.invalid) {
      this.form.markAllAsTouched();
      this.configForm.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const issuer = await this.op.run(() =>
      this.ca.importIssuer({
        ProjectID: v.projectId,
        Label: v.label.trim(),
        Type: v.type,
        Certificate: v.certificate.trim(),
        Intermediates: v.intermediates.trim(),
        Root: v.root.trim(),
        KeyURI: v.keyMode === 'uri' ? v.keyUri.trim() : '',
        KeyPem: v.keyMode === 'pem' ? v.keyPem.trim() : '',
        Config: valuesToConfig(this.configForm.getRawValue()),
      }),
    );
    // the key material is sent once: it does not stay in the form
    this.form.controls.keyPem.setValue('');
    if (issuer) {
      if (issuer.SKID) {
        this.tenant.rememberIssuerLabels([[issuer.SKID, issuer.Label]]);
      }
      this.notify.info(`Issuer ${issuer.Label} imported`);
      await this.router.navigate(['/issuers', issuer.ID]);
    }
  }
}
