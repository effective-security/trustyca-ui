import type { PartialMessage } from '@protobuf-ts/runtime';
import { RegisterIssuerRequest } from 'src/services/trustyca/protogen/ca';
import { AuthorityType_Enum, X509Subject } from 'src/services/trustyca/protogen/pkix';
import { IssuerConfigValues, valuesToConfig } from './issuer-config.model';

/**
 * How the certificate of a new issuer is signed (DESIGN.md section 8.1):
 * by its own key (a Root), by an Active issuer of the scope, by a platform
 * issuer the operator named, or outside the CA (a Pending issuer with a CSR)
 */
export type SigningMode = 'self' | 'parent' | 'platform' | 'external';

export type KeyAlgo = 'ECDSA' | 'RSA';

/** The sizes the server accepts per algorithm (`internal/ca/keys.go`) */
export const KEY_SIZES: Record<KeyAlgo, readonly number[]> = {
  ECDSA: [256, 384],
  RSA: [2048, 3072, 4096],
};

/** The key the server generates when the request names none */
export const DEFAULT_KEY = { algo: 'ECDSA' as KeyAlgo, size: 256 };

export interface IssuerTypeOption {
  readonly value: AuthorityType_Enum;
  readonly label: string;
  readonly description: string;
}

export const ISSUER_TYPES: readonly IssuerTypeOption[] = [
  {
    value: AuthorityType_Enum.Root,
    label: 'Root',
    description:
      'A self-signed trust anchor. It signs subordinate CAs, not end-entity certificates.',
  },
  {
    value: AuthorityType_Enum.Intermediate,
    label: 'Intermediate',
    description: 'Signs subordinate CAs only, under a root or another intermediate.',
  },
  {
    value: AuthorityType_Enum.Issuing,
    label: 'Issuing',
    description: 'Signs end-entity certificates with the profiles bound to it.',
  },
  {
    value: AuthorityType_Enum.Shaken,
    label: 'SHAKEN',
    description: 'A STIR/SHAKEN authority for telephone number certificates.',
  },
  {
    value: AuthorityType_Enum.ShakenDelegated,
    label: 'SHAKEN delegated',
    description: 'A STIR/SHAKEN delegated authority, signed by a platform SHAKEN CA.',
  },
];

export interface SubjectValues {
  readonly CommonName: string;
  readonly Organisation: string;
  readonly OrganisationalUnit: string;
  readonly Country: string;
  readonly State: string;
  readonly Locality: string;
  readonly SerialNumber: string;
}

export interface RegisterIssuerValues {
  /** '' for an org-wide issuer */
  readonly projectId: string;
  readonly label: string;
  readonly type: AuthorityType_Enum;
  readonly subject: SubjectValues;
  /** The subject alternative names, one per line */
  readonly san: string;
  readonly keyAlgo: KeyAlgo;
  readonly keySize: number;
  /** '' for the default provider of the server */
  readonly keyProvider: string;
  readonly signing: SigningMode;
  /** The Active issuer of the scope that signs, for 'parent' */
  readonly parentId: string;
  /** The platform issuer an operator named, for 'platform' */
  readonly platformParentId: string;
  /** The CA profile the signer uses; required unless the signing is external */
  readonly profile: string;
  readonly config: IssuerConfigValues;
}

/** The signing modes a type allows: a Root signs itself, the others are signed */
export function signingModes(type: AuthorityType_Enum): SigningMode[] {
  return type === AuthorityType_Enum.Root ? ['self'] : ['parent', 'platform', 'external'];
}

/** The lines of a text, trimmed, without the empty ones */
export function parseLines(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True when the subject names anything: the server refuses an empty one */
export function hasSubject(subject: SubjectValues): boolean {
  return [
    subject.CommonName,
    subject.Organisation,
    subject.OrganisationalUnit,
    subject.Country,
    subject.State,
    subject.Locality,
    subject.SerialNumber,
  ].some((v) => v.trim() !== '');
}

/** The problems that stop the registration, for the review step; empty when it may go */
export function validateRegistration(values: RegisterIssuerValues): string[] {
  const problems: string[] = [];
  if (!values.label.trim()) {
    problems.push('A label is required.');
  }
  if (values.type === AuthorityType_Enum.Unknown) {
    problems.push('Choose the type of the authority.');
  }
  if (!hasSubject(values.subject)) {
    problems.push('The subject needs a common name or at least one name field.');
  }
  if (!KEY_SIZES[values.keyAlgo]?.includes(values.keySize)) {
    problems.push(`${values.keyAlgo} does not accept a key of ${values.keySize} bits.`);
  }
  if (!signingModes(values.type).includes(values.signing)) {
    problems.push(
      values.type === AuthorityType_Enum.Root
        ? 'A Root issuer is self-signed.'
        : 'Choose how the issuer certificate is signed.',
    );
  }
  if (values.signing === 'parent' && !values.parentId) {
    problems.push('Choose the parent issuer.');
  }
  if (values.signing === 'platform' && !values.platformParentId.trim()) {
    problems.push('Enter the ID of the platform issuer.');
  }
  if (values.signing !== 'external' && !values.profile.trim()) {
    problems.push('The CA profile the signer uses is required.');
  }
  return problems;
}

/** The X509Subject of the form; the name fields go in one X509Name */
export function toX509Subject(subject: SubjectValues): PartialMessage<X509Subject> {
  const name = {
    Country: subject.Country.trim(),
    State: subject.State.trim(),
    Locality: subject.Locality.trim(),
    Organisation: subject.Organisation.trim(),
    OrganisationalUnit: subject.OrganisationalUnit.trim(),
    SerialNumber: '',
  };
  const hasName = Object.values(name).some(Boolean);
  return {
    CommonName: subject.CommonName.trim(),
    SerialNumber: subject.SerialNumber.trim(),
    Names: hasName ? [name] : [],
  };
}

/** 'CN=x, O=y, OU=z, C=US' of the form values, for the review */
export function subjectText(subject: SubjectValues): string {
  const parts: string[] = [];
  const add = (k: string, v: string) => v.trim() && parts.push(`${k}=${v.trim()}`);
  add('CN', subject.CommonName);
  add('O', subject.Organisation);
  add('OU', subject.OrganisationalUnit);
  add('L', subject.Locality);
  add('ST', subject.State);
  add('C', subject.Country);
  add('serialNumber', subject.SerialNumber);
  return parts.join(', ');
}

/**
 * The RegisterIssuerRequest of the form: ParentID and Profile per signing
 * mode (a Root names no parent, an external signature neither), the key
 * spec always named, so the review shows what the server generates
 */
export function buildRegisterIssuerRequest(
  values: RegisterIssuerValues,
): PartialMessage<RegisterIssuerRequest> {
  const parentId =
    values.signing === 'parent'
      ? values.parentId
      : values.signing === 'platform'
        ? values.platformParentId.trim()
        : '';
  return {
    ProjectID: values.projectId,
    Label: values.label.trim(),
    Type: values.type,
    Subject: toX509Subject(values.subject),
    KeySpec: { Algo: values.keyAlgo, Size: values.keySize },
    KeyProvider: values.keyProvider.trim(),
    ParentID: parentId,
    Profile: values.signing === 'external' ? '' : values.profile.trim(),
    Config: valuesToConfig(values.config),
    SAN: parseLines(values.san),
    Extensions: [],
  };
}

/** 'ECDSA P-256', 'RSA 3072' */
export function keyLabel(algo: KeyAlgo, size: number): string {
  return algo === 'ECDSA' ? `ECDSA P-${size}` : `RSA ${size}`;
}
