import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { AuthorityType_Enum, Issuer, IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';
import { INITIAL_CURSOR } from '../../core/api/paged-resource';
import { CA_SERVICE } from '../../core/api/tokens';
import { AuthStore } from '../../core/auth/auth.store';
import { TenantStore } from '../../core/tenant/tenant.store';
import { Operation } from '../../shared/ca-state/operation';
import { RequestError } from '../../shared/ca-state/request-error';
import { Icon } from '../../shared/icon/icon';
import { KvItem, KvList } from '../../shared/kv-list/kv-list';
import { NotifyService } from '../../shared/notify/notify';
import { PageHeading } from '../../shared/page-heading/page-heading';
import { PemViewer } from '../../shared/pem-viewer/pem-viewer';
import { enumName } from '../../shared/pipes/enum-name.pipe';
import { textControl } from '../../shared/forms/controls';
import { StatusChip, issuerStatusTone } from '../../shared/status-chip/status-chip';
import { Stepper, StepperState } from '../../shared/stepper/stepper';
import { ActivateIssuerDialog } from './activate-issuer-dialog';
import { IssuerConfigFormFields } from './issuer-config-form';
import {
  configToValues,
  describeConfig,
  issuerConfigForm,
  valuesToConfig,
} from './issuer-config.model';
import {
  DEFAULT_KEY,
  ISSUER_TYPES,
  KEY_SIZES,
  KeyAlgo,
  RegisterIssuerValues,
  SigningMode,
  buildRegisterIssuerRequest,
  hasSubject,
  keyLabel,
  parseLines,
  signingModes,
  subjectText,
  validateRegistration,
} from './register-issuer.model';

/** The most Active issuers the parent selector reads */
const PARENT_PAGE_SIZE = 200;

/** The subject needs a common name or at least one name field; error `subject` */
const subjectRequired: ValidatorFn = (group: AbstractControl): ValidationErrors | null =>
  hasSubject(group.getRawValue()) ? null : { subject: true };

/**
 * The register issuer stepper (DESIGN.md section 8.1): scope and label,
 * type, subject and SAN, key, signing, configuration, review; one
 * RegisterIssuer at the end, a key operation with the longer deadline. A
 * Pending issuer ends on its signing request, an Active one on its page.
 */
@Component({
  selector: 'app-register-issuer',
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
    KvList,
    PageHeading,
    PemViewer,
    RequestError,
    StatusChip,
    Stepper,
  ],
  templateUrl: './register-issuer.html',
  styleUrl: './register-issuer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterIssuer {
  private readonly ca = inject(CA_SERVICE);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);
  private readonly session = inject(AuthStore);
  protected readonly tenant = inject(TenantStore);
  protected readonly types = ISSUER_TYPES;
  protected readonly algos: readonly KeyAlgo[] = ['ECDSA', 'RSA'];
  protected readonly keyLabel = keyLabel;
  protected readonly statusTone = issuerStatusTone;
  protected readonly op = new Operation();

  protected readonly scopeForm = new FormGroup({
    projectId: textControl(this.tenant.projectId()),
    label: textControl('', [
      Validators.required,
      Validators.maxLength(64),
      Validators.pattern(/^\S+$/),
    ]),
  });
  protected readonly typeForm = new FormGroup({
    type: new FormControl<AuthorityType_Enum>(AuthorityType_Enum.Issuing, {
      nonNullable: true,
      validators: [Validators.min(1)],
    }),
  });
  protected readonly subjectForm = new FormGroup(
    {
      CommonName: textControl('', [Validators.maxLength(64)]),
      Organisation: textControl('', [Validators.maxLength(64)]),
      OrganisationalUnit: textControl('', [Validators.maxLength(64)]),
      Country: textControl('', [Validators.maxLength(2), Validators.pattern(/^[A-Za-z]{0,2}$/)]),
      State: textControl('', [Validators.maxLength(128)]),
      Locality: textControl('', [Validators.maxLength(128)]),
      SerialNumber: textControl('', [Validators.maxLength(64)]),
      san: textControl(''),
    },
    { validators: [subjectRequired] },
  );
  protected readonly keyForm = new FormGroup({
    keyAlgo: new FormControl<KeyAlgo>(DEFAULT_KEY.algo, { nonNullable: true }),
    keySize: new FormControl<number>(DEFAULT_KEY.size, { nonNullable: true }),
    keyProvider: textControl('', [Validators.maxLength(64)]),
  });
  protected readonly signingForm = new FormGroup({
    signing: new FormControl<SigningMode>('parent', { nonNullable: true }),
    parentId: textControl(''),
    platformParentId: textControl(''),
    profile: textControl('', [Validators.maxLength(64)]),
  });
  protected readonly configForm = issuerConfigForm();
  /** The steps of DESIGN.md section 8.1; the review has no form of its own */
  protected readonly stepper = new StepperState([
    { label: 'Scope and label', control: this.scopeForm },
    { label: 'Type', control: this.typeForm },
    { label: 'Subject', control: this.subjectForm },
    { label: 'Key', control: this.keyForm },
    { label: 'Signing', control: this.signingForm },
    { label: 'Configuration', control: this.configForm },
    { label: 'Review' },
  ]);
  protected readonly REVIEW_STEP = 6;

  protected readonly projectId = toSignal(this.scopeForm.controls.projectId.valueChanges, {
    initialValue: this.scopeForm.controls.projectId.value,
  });
  protected readonly type = toSignal(this.typeForm.controls.type.valueChanges, {
    initialValue: this.typeForm.controls.type.value,
  });
  protected readonly signing = toSignal(this.signingForm.controls.signing.valueChanges, {
    initialValue: this.signingForm.controls.signing.value,
  });
  protected readonly parentId = toSignal(this.signingForm.controls.parentId.valueChanges, {
    initialValue: '',
  });
  protected readonly keyAlgo = toSignal(this.keyForm.controls.keyAlgo.valueChanges, {
    initialValue: this.keyForm.controls.keyAlgo.value,
  });

  protected readonly modes = computed(() => signingModes(this.type()));
  protected readonly isRoot = computed(() => this.type() === AuthorityType_Enum.Root);
  protected readonly keySizes = computed(() => KEY_SIZES[this.keyAlgo()]);
  protected readonly typeLabel = computed(() => enumName('AuthorityType', this.type()));

  /** The Active issuers of the org, for the parent selector */
  protected readonly parents = resource({
    params: () => this.session.orgId() || undefined,
    loader: () =>
      this.ca.listIssuers({
        ProjectID: '',
        Status: IssuerStatus_Enum.Active,
        Limit: PARENT_PAGE_SIZE,
        Cursor: INITIAL_CURSOR,
      }),
  });
  /** The parents visible from the scope of the new issuer: org-wide, or of its project */
  protected readonly parentOptions = computed(() => {
    const rows = this.parents.hasValue() ? this.parents.value().Issuers : [];
    const projectId = this.projectId();
    return rows
      .filter((i) => !i.ProjectID || i.ProjectID === projectId)
      .sort((a, b) => a.Label.localeCompare(b.Label));
  });
  protected readonly selectedParent = computed(() =>
    this.parentOptions().find((p) => p.ID === this.parentId()),
  );

  /** The values under review, collected when the last step opens */
  protected readonly review = signal<RegisterIssuerValues | undefined>(undefined);
  protected readonly problems = computed(() => {
    const v = this.review();
    return v ? validateRegistration(v) : [];
  });
  protected readonly summary = computed<KvItem[]>(() => {
    const v = this.review();
    return v ? this.describe(v) : [];
  });
  protected readonly configSummary = computed<KvItem[]>(() => {
    const v = this.review();
    return v ? describeConfig(valuesToConfig(v.config)) : [];
  });

  /** The issuer the server registered, when it waits for an external signature */
  protected readonly pending = signal<Issuer | undefined>(undefined);

  constructor() {
    // a Root signs itself; the others are signed by a parent
    effect(() => {
      const modes = this.modes();
      const current = untracked(this.signing);
      if (!modes.includes(current)) {
        this.signingForm.controls.signing.setValue(modes[0]);
      }
    });
    // the size follows the algorithm
    effect(() => {
      const sizes = this.keySizes();
      const size = untracked(() => this.keyForm.controls.keySize.value);
      if (!sizes.includes(size)) {
        this.keyForm.controls.keySize.setValue(sizes[0]);
      }
    });
    // the configuration defaults to the parent's until the user touches it
    effect(() => {
      const parent = this.selectedParent();
      if (parent?.Config && !this.configForm.dirty) {
        this.configForm.reset(configToValues(parent.Config));
      }
    });
    // the signing mode decides which of the parent, the platform issuer and
    // the profile are required
    effect(() => {
      const mode = this.signing();
      const c = this.signingForm.controls;
      c.parentId.setValidators(mode === 'parent' ? [Validators.required] : []);
      c.platformParentId.setValidators(mode === 'platform' ? [Validators.required] : []);
      c.profile.setValidators(
        mode === 'external'
          ? [Validators.maxLength(64)]
          : [Validators.required, Validators.maxLength(64)],
      );
      c.parentId.updateValueAndValidity();
      c.platformParentId.updateValueAndValidity();
      c.profile.updateValueAndValidity();
    });
    // a parent outside the scope is no longer offered
    effect(() => {
      const options = this.parentOptions();
      const id = untracked(this.parentId);
      if (id && !options.some((p) => p.ID === id)) {
        this.signingForm.controls.parentId.setValue('');
      }
    });
  }

  /** Opens the next step when the current form allows; the review collects the values */
  protected next(): void {
    if (this.stepper.next() && this.stepper.selectedIndex() === this.REVIEW_STEP) {
      this.review.set(this.collect());
    }
  }

  protected back(): void {
    this.stepper.previous();
  }

  /** Fills the configuration from the parent again */
  protected copyParentConfig(): void {
    const parent = this.selectedParent();
    if (parent) {
      this.configForm.reset(configToValues(parent.Config));
    }
  }

  protected async register(): Promise<void> {
    const values = this.collect();
    this.review.set(values);
    if (validateRegistration(values).length > 0) {
      return;
    }
    const issuer = await this.op.run(() =>
      this.ca.registerIssuer(buildRegisterIssuerRequest(values)),
    );
    if (!issuer) {
      return;
    }
    if (issuer.SKID) {
      this.tenant.rememberIssuerLabels([[issuer.SKID, issuer.Label]]);
    }
    if (issuer.Status === IssuerStatus_Enum.Pending) {
      this.pending.set(issuer);
      return;
    }
    this.notify.info(`Issuer ${issuer.Label} registered`);
    await this.router.navigate(['/issuers', issuer.ID]);
  }

  /** Activates the Pending issuer at once, when the signed certificate is at hand */
  protected async activate(): Promise<void> {
    const issuer = this.pending();
    if (!issuer) {
      return;
    }
    const activated = await ActivateIssuerDialog.open(this.dialog, issuer);
    if (activated) {
      this.notify.info(`Issuer ${activated.Label} activated`);
      await this.router.navigate(['/issuers', activated.ID]);
    }
  }

  private collect(): RegisterIssuerValues {
    const scope = this.scopeForm.getRawValue();
    const subject = this.subjectForm.getRawValue();
    const key = this.keyForm.getRawValue();
    const signing = this.signingForm.getRawValue();
    return {
      projectId: scope.projectId,
      label: scope.label,
      type: this.typeForm.controls.type.value,
      subject: {
        CommonName: subject.CommonName,
        Organisation: subject.Organisation,
        OrganisationalUnit: subject.OrganisationalUnit,
        Country: subject.Country.toUpperCase(),
        State: subject.State,
        Locality: subject.Locality,
        SerialNumber: subject.SerialNumber,
      },
      san: subject.san,
      keyAlgo: key.keyAlgo,
      keySize: key.keySize,
      keyProvider: key.keyProvider,
      signing: signing.signing,
      parentId: signing.parentId,
      platformParentId: signing.platformParentId,
      profile: signing.profile,
      config: this.configForm.getRawValue(),
    };
  }

  private describe(v: RegisterIssuerValues): KvItem[] {
    const parent = this.parentOptions().find((p) => p.ID === v.parentId);
    const signing = {
      self: `Self-signed with the CA profile ${v.profile || '?'}`,
      parent: `Signed by ${parent?.Label || v.parentId || '?'} with the CA profile ${v.profile || '?'}`,
      platform: `Signed by the platform issuer ${v.platformParentId || '?'} with the CA profile ${v.profile || '?'}`,
      external: 'Externally: the issuer waits for its certificate with a signing request',
    }[v.signing];
    return [
      { key: 'Scope', value: this.tenant.scopeLabel(v.projectId) },
      { key: 'Label', value: v.label, mono: true },
      { key: 'Type', value: enumName('AuthorityType', v.type) },
      { key: 'Subject', value: subjectText(v.subject), mono: true },
      { key: 'Subject alternative names', value: parseLines(v.san).join(', '), empty: 'None' },
      { key: 'Key', value: keyLabel(v.keyAlgo, v.keySize) },
      { key: 'Key provider', value: v.keyProvider, empty: 'Server default' },
      { key: 'Signing', value: signing },
    ];
  }
}
