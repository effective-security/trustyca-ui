import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ISSUER_ID_PLACEHOLDER, IssuerConfigForm } from './issuer-config.model';

/**
 * The fields of an IssuerConfig (DESIGN.md section 8.1): the URL templates
 * of AIA, OCSP and CRL, the CRL and OCSP timings, the delegated OCSP
 * profile, the allowed profiles and the extension policy. The register
 * stepper, the import form and the Configuration tab share it.
 */
@Component({
  selector: 'app-issuer-config-form',
  imports: [ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `<div class="config-form" [formGroup]="form()">
    <p class="config-note">
      Every field is optional: the server applies its defaults to an empty one. The URL templates
      name the issuer with <code>{{ placeholder }}</code
      >, replaced by its key identifier.
    </p>
    <mat-form-field appearance="outline" class="wide">
      <mat-label>AIA issuer URL</mat-label>
      <input
        matInput
        formControlName="AiaURL"
        placeholder="https://ca.example.com/v1/cert/:ISSUER_ID"
        autocomplete="off"
        spellcheck="false"
      />
      @if (form().controls.AiaURL.hasError('urlTemplate')) {
        <mat-error>An http or https URL.</mat-error>
      }
    </mat-form-field>
    <mat-form-field appearance="outline" class="wide">
      <mat-label>OCSP URL</mat-label>
      <input
        matInput
        formControlName="OcspURL"
        placeholder="https://ca.example.com/v1/ocspi/:ISSUER_ID"
        autocomplete="off"
        spellcheck="false"
      />
      @if (form().controls.OcspURL.hasError('urlTemplate')) {
        <mat-error>An http or https URL.</mat-error>
      }
    </mat-form-field>
    <mat-form-field appearance="outline" class="wide">
      <mat-label>CRL distribution point URL</mat-label>
      <input
        matInput
        formControlName="CrlURL"
        placeholder="https://ca.example.com/v1/crl/:ISSUER_ID"
        autocomplete="off"
        spellcheck="false"
      />
      @if (form().controls.CrlURL.hasError('urlTemplate')) {
        <mat-error>An http or https URL.</mat-error>
      }
    </mat-form-field>
    <mat-form-field appearance="outline">
      <mat-label>CRL expiry</mat-label>
      <input matInput formControlName="CrlExpiry" placeholder="48h" autocomplete="off" />
      <mat-hint>How long a CRL is valid.</mat-hint>
      @if (form().controls.CrlExpiry.hasError('goDuration')) {
        <mat-error>A duration such as 48h or 30m.</mat-error>
      }
    </mat-form-field>
    <mat-form-field appearance="outline">
      <mat-label>CRL renewal</mat-label>
      <input matInput formControlName="CrlRenewal" placeholder="12h" autocomplete="off" />
      <mat-hint>How long before its next update a CRL is renewed.</mat-hint>
      @if (form().controls.CrlRenewal.hasError('goDuration')) {
        <mat-error>A duration such as 12h.</mat-error>
      }
    </mat-form-field>
    <mat-form-field appearance="outline">
      <mat-label>OCSP expiry</mat-label>
      <input matInput formControlName="OcspExpiry" placeholder="1h" autocomplete="off" />
      <mat-hint>How long an OCSP response is valid.</mat-hint>
      @if (form().controls.OcspExpiry.hasError('goDuration')) {
        <mat-error>A duration such as 1h.</mat-error>
      }
    </mat-form-field>
    <mat-form-field appearance="outline">
      <mat-label>Delegated OCSP profile</mat-label>
      <input
        matInput
        formControlName="DelegatedOcspProfile"
        autocomplete="off"
        spellcheck="false"
      />
      <mat-hint
        >The profile of a delegated OCSP responder; empty signs OCSP with the issuer key.</mat-hint
      >
    </mat-form-field>
    <mat-form-field appearance="outline" class="wide">
      <mat-label>Allowed profiles</mat-label>
      <input matInput formControlName="AllowedProfiles" autocomplete="off" spellcheck="false" />
      <mat-hint
        >Labels separated by commas. Required for the profiles bound to any issuer (issuer label
        *).</mat-hint
      >
    </mat-form-field>
    <mat-checkbox formControlName="OmitDisabledExtensions" class="wide"
      >Drop the extensions a profile does not allow instead of refusing the request</mat-checkbox
    >
  </div>`,
  styles: `
    .config-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 16px;
    }
    .wide {
      grid-column: 1 / -1;
    }
    .config-note {
      grid-column: 1 / -1;
      margin: 0 0 12px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--muted);
    }
    .config-note code {
      font-family: var(--mono);
      background: #f1f4ee;
      padding: 1px 6px;
      border-radius: 4px;
    }
    mat-checkbox {
      margin-top: 4px;
      font-size: 12px;
    }
    @media (max-width: 700px) {
      .config-form {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuerConfigFormFields {
  readonly form = input.required<IssuerConfigForm>();
  protected readonly placeholder = ISSUER_ID_PLACEHOLDER;
}
