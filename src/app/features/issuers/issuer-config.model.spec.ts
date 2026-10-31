import { FormControl } from '@angular/forms';
import { IssuerConfig } from 'src/services/trustyca/protogen/pkix';
import {
  configToValues,
  describeConfig,
  isEmptyConfig,
  issuerConfigForm,
  parseLabels,
  urlTemplate,
  valuesToConfig,
} from './issuer-config.model';

describe('issuer configuration model', () => {
  const config = IssuerConfig.create({
    AiaURL: 'http://localhost:8888/v1/cert/:ISSUER_ID',
    OcspURL: 'http://localhost:8888/v1/ocspi/:ISSUER_ID',
    CrlURL: 'http://localhost:8888/v1/crl/:ISSUER_ID',
    CrlExpiry: '48h',
    CrlRenewal: '12h',
    OcspExpiry: '1h',
    DelegatedOcspProfile: 'ocsp',
    AllowedProfiles: ['tenant_ca', 'server'],
    OmitDisabledExtensions: true,
  });

  it('round-trips a configuration through the form values', () => {
    const values = configToValues(config);
    expect(values.AllowedProfiles).toBe('tenant_ca, server');
    expect(values.OmitDisabledExtensions).toBe(true);
    expect(valuesToConfig(values)).toEqual(config);
  });

  it('trims the fields and splits the labels on commas, spaces and lines', () => {
    const built = valuesToConfig({
      ...configToValues(undefined),
      AiaURL: '  http://aia/:ISSUER_ID ',
      CrlExpiry: ' 24h',
      AllowedProfiles: 'a, b\nc  d,a',
    });
    expect(built.AiaURL).toBe('http://aia/:ISSUER_ID');
    expect(built.CrlExpiry).toBe('24h');
    expect(built.AllowedProfiles).toEqual(['a', 'b', 'c', 'd']);
    expect(parseLabels('')).toEqual([]);
    expect(parseLabels(null)).toEqual([]);
  });

  it('knows an empty configuration, which leaves the server defaults', () => {
    expect(isEmptyConfig(IssuerConfig.create())).toBe(true);
    expect(isEmptyConfig(valuesToConfig(configToValues(undefined)))).toBe(true);
    expect(isEmptyConfig(IssuerConfig.create({ CrlExpiry: '1h' }))).toBe(false);
    expect(isEmptyConfig(IssuerConfig.create({ AllowedProfiles: ['x'] }))).toBe(false);
  });

  it('builds a form from a configuration and validates the templates and durations', () => {
    const form = issuerConfigForm(config);
    expect(form.getRawValue()).toEqual(configToValues(config));
    expect(form.valid).toBe(true);
    form.controls.AiaURL.setValue('ftp://nope');
    form.controls.CrlExpiry.setValue('2 days');
    expect(form.controls.AiaURL.hasError('urlTemplate')).toBe(true);
    expect(form.controls.CrlExpiry.hasError('goDuration')).toBe(true);
    expect(form.valid).toBe(false);
    expect(issuerConfigForm().valid).toBe(true);
  });

  it('urlTemplate accepts http and https URLs with the placeholder', () => {
    const run = (v: string) => urlTemplate()(new FormControl(v));
    expect(run('')).toBeNull();
    expect(run('https://ca.example.com/v1/crl/:ISSUER_ID')).toBeNull();
    expect(run('http://localhost:8888/v1/cert/${ISSUER_ID}')).toBeNull();
    expect(run('ca.example.com/crl')).toEqual({ urlTemplate: { value: 'ca.example.com/crl' } });
    expect(run('https://with space')).not.toBeNull();
  });

  it('describes a configuration with the server defaults for the empty fields', () => {
    const items = describeConfig(undefined);
    expect(items.map((i) => i.key)).toEqual([
      'AIA issuer URL',
      'OCSP URL',
      'CRL URL',
      'CRL expiry',
      'CRL renewal',
      'OCSP expiry',
      'Delegated OCSP profile',
      'Allowed profiles',
      'Disabled extensions',
    ]);
    expect(items[0].empty).toBe('Server default');
    expect(items[8].value).toBe('Refused');
    const full = describeConfig(config);
    expect(full[7].value).toBe('tenant_ca, server');
    expect(full[8].value).toBe('Dropped from the request');
  });
});
