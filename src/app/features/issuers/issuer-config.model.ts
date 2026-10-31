import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { IssuerConfig } from 'src/services/trustyca/protogen/pkix';
import { textControl } from '../../shared/forms/controls';
import { goDuration } from '../../shared/forms/validators';
import type { KvItem } from '../../shared/kv-list/kv-list';

/** The placeholder of the URL templates the API accepts; the SKID of the issuer replaces it */
export const ISSUER_ID_PLACEHOLDER = ':ISSUER_ID';

/** The runtime settings of an issuer as the form holds them */
export interface IssuerConfigValues {
  readonly AiaURL: string;
  readonly OcspURL: string;
  readonly CrlURL: string;
  readonly CrlExpiry: string;
  readonly CrlRenewal: string;
  readonly OcspExpiry: string;
  readonly DelegatedOcspProfile: string;
  /** The labels, separated by commas, spaces or lines */
  readonly AllowedProfiles: string;
  readonly OmitDisabledExtensions: boolean;
}

export type IssuerConfigForm = FormGroup<{
  AiaURL: FormControl<string>;
  OcspURL: FormControl<string>;
  CrlURL: FormControl<string>;
  CrlExpiry: FormControl<string>;
  CrlRenewal: FormControl<string>;
  OcspExpiry: FormControl<string>;
  DelegatedOcspProfile: FormControl<string>;
  AllowedProfiles: FormControl<string>;
  OmitDisabledExtensions: FormControl<boolean>;
}>;

/** Valid when empty or an http(s) URL template; error `urlTemplate` */
export function urlTemplate(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v: unknown = control.value;
    const text = typeof v === 'string' ? v.trim() : '';
    return text === '' || /^https?:\/\/\S+$/i.test(text) ? null : { urlTemplate: { value: text } };
  };
}

/** The labels of a text separated by commas, spaces or lines, in order, without repeats */
export function parseLabels(text: string | null | undefined): string[] {
  const labels = (text ?? '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(labels)];
}

/** The form values of a configuration; the defaults of the server for none */
export function configToValues(config: IssuerConfig | undefined): IssuerConfigValues {
  return {
    AiaURL: config?.AiaURL ?? '',
    OcspURL: config?.OcspURL ?? '',
    CrlURL: config?.CrlURL ?? '',
    CrlExpiry: config?.CrlExpiry ?? '',
    CrlRenewal: config?.CrlRenewal ?? '',
    OcspExpiry: config?.OcspExpiry ?? '',
    DelegatedOcspProfile: config?.DelegatedOcspProfile ?? '',
    AllowedProfiles: (config?.AllowedProfiles ?? []).join(', '),
    OmitDisabledExtensions: config?.OmitDisabledExtensions ?? false,
  };
}

/** The configuration a form sends: trimmed, the labels as a list */
export function valuesToConfig(values: IssuerConfigValues): IssuerConfig {
  return IssuerConfig.create({
    AiaURL: values.AiaURL.trim(),
    OcspURL: values.OcspURL.trim(),
    CrlURL: values.CrlURL.trim(),
    CrlExpiry: values.CrlExpiry.trim(),
    CrlRenewal: values.CrlRenewal.trim(),
    OcspExpiry: values.OcspExpiry.trim(),
    DelegatedOcspProfile: values.DelegatedOcspProfile.trim(),
    AllowedProfiles: parseLabels(values.AllowedProfiles),
    OmitDisabledExtensions: values.OmitDisabledExtensions,
  });
}

/** True when the configuration sets nothing: the server applies its defaults */
export function isEmptyConfig(config: IssuerConfig): boolean {
  return (
    !config.AiaURL &&
    !config.OcspURL &&
    !config.CrlURL &&
    !config.CrlExpiry &&
    !config.CrlRenewal &&
    !config.OcspExpiry &&
    !config.DelegatedOcspProfile &&
    config.AllowedProfiles.length === 0 &&
    !config.OmitDisabledExtensions
  );
}

/** A form for the runtime settings, filled from a configuration */
export function issuerConfigForm(config?: IssuerConfig): IssuerConfigForm {
  const v = configToValues(config);
  return new FormGroup({
    AiaURL: textControl(v.AiaURL, [urlTemplate()]),
    OcspURL: textControl(v.OcspURL, [urlTemplate()]),
    CrlURL: textControl(v.CrlURL, [urlTemplate()]),
    CrlExpiry: textControl(v.CrlExpiry, [goDuration()]),
    CrlRenewal: textControl(v.CrlRenewal, [goDuration()]),
    OcspExpiry: textControl(v.OcspExpiry, [goDuration()]),
    DelegatedOcspProfile: textControl(v.DelegatedOcspProfile),
    AllowedProfiles: textControl(v.AllowedProfiles),
    OmitDisabledExtensions: new FormControl(v.OmitDisabledExtensions, { nonNullable: true }),
  });
}

/** The configuration as a key-value list, for the overview and the review */
export function describeConfig(config: IssuerConfig | undefined): KvItem[] {
  const c = config ?? IssuerConfig.create();
  return [
    { key: 'AIA issuer URL', value: c.AiaURL, mono: true, empty: 'Server default' },
    { key: 'OCSP URL', value: c.OcspURL, mono: true, empty: 'Server default' },
    { key: 'CRL URL', value: c.CrlURL, mono: true, empty: 'Server default' },
    { key: 'CRL expiry', value: c.CrlExpiry, empty: 'Server default' },
    { key: 'CRL renewal', value: c.CrlRenewal, empty: 'Server default' },
    { key: 'OCSP expiry', value: c.OcspExpiry, empty: 'Server default' },
    {
      key: 'Delegated OCSP profile',
      value: c.DelegatedOcspProfile,
      empty: 'None: OCSP is signed with the issuer key',
    },
    {
      key: 'Allowed profiles',
      value: c.AllowedProfiles.join(', '),
      empty: 'None: only the profiles bound to the issuer',
    },
    {
      key: 'Disabled extensions',
      value: c.OmitDisabledExtensions ? 'Dropped from the request' : 'Refused',
    },
  ];
}
