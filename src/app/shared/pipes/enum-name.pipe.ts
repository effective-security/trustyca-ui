import { Pipe, PipeTransform } from '@angular/core';
import { Scope_Enum } from 'src/services/trustyca/protogen/types';
import {
  AuthorityTypeName,
  CertificateStatusName,
  EncodingFormatName,
  EventTypeName,
  getAuthorityTypeDisplayName,
  getCertificateStatusDisplayName,
  getEncodingFormatDisplayName,
  getEventTypeDisplayName,
  getIDPDisplayName,
  getIssuerStatusDisplayName,
  getItemStatusDisplayName,
  getReasonCodeDisplayName,
  getRoleDisplayName,
  getRoleSourceDisplayName,
  getTrustDisplayName,
  IDPName,
  IssuerStatusName,
  ItemStatusName,
  parseAuthorityType,
  parseCertificateStatus,
  parseEncodingFormat,
  parseEventType,
  parseIDP,
  parseIssuerStatus,
  parseItemStatus,
  parseReasonCode,
  parseRole,
  parseRoleSource,
  parseTrust,
  ReasonCodeName,
  RoleName,
  RoleSourceName,
  TrustName,
} from 'src/services/trustyca/rpc/enums';

/** The enums of the API with a display name (generated into enums.ts, Scope by hand) */
export type EnumKind =
  | 'AuthorityType'
  | 'CertificateStatus'
  | 'EncodingFormat'
  | 'EventType'
  | 'IDP'
  | 'IssuerStatus'
  | 'ItemStatus'
  | 'ReasonCode'
  | 'Role'
  | 'RoleSource'
  | 'Scope'
  | 'Trust';

const SCOPE_NAMES: Record<Scope_Enum, string> = {
  [Scope_Enum.Undefined]: '',
  [Scope_Enum.Org]: 'Organization',
  [Scope_Enum.Project]: 'Project',
};

/**
 * The generated display helpers take the number or its decimal string; the
 * server also hands out names ('Owner' in the token). A name is parsed
 * first, and a name the enum does not know is shown as it is.
 */
function withNames<E extends number>(
  display: (value: E | string) => string,
  parse: (value: string | E) => E,
  names: Record<string | number, string>,
): (value: number | string) => string {
  return (value) => {
    if (typeof value !== 'string' || /^\d+$/.test(value)) {
      return display(value as E);
    }
    const parsed = parse(value);
    return parsed !== 0 || names[0] === value ? display(parsed) : value;
  };
}

const DISPLAY: Record<EnumKind, (value: number | string) => string> = {
  AuthorityType: withNames(getAuthorityTypeDisplayName, parseAuthorityType, AuthorityTypeName),
  CertificateStatus: withNames(
    getCertificateStatusDisplayName,
    parseCertificateStatus,
    CertificateStatusName,
  ),
  EncodingFormat: withNames(getEncodingFormatDisplayName, parseEncodingFormat, EncodingFormatName),
  EventType: withNames(getEventTypeDisplayName, parseEventType, EventTypeName),
  IDP: withNames(getIDPDisplayName, parseIDP, IDPName),
  IssuerStatus: withNames(getIssuerStatusDisplayName, parseIssuerStatus, IssuerStatusName),
  ItemStatus: withNames(getItemStatusDisplayName, parseItemStatus, ItemStatusName),
  ReasonCode: withNames(getReasonCodeDisplayName, parseReasonCode, ReasonCodeName),
  Role: withNames(getRoleDisplayName, parseRole, RoleName),
  RoleSource: withNames(getRoleSourceDisplayName, parseRoleSource, RoleSourceName),
  Scope: (value) => SCOPE_NAMES[value as Scope_Enum] ?? '',
  Trust: withNames(getTrustDisplayName, parseTrust, TrustName),
};

/** The display name of an enum value (a number, or a name the server hands out), by the enum's name */
export function enumName(kind: EnumKind, value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? '' : DISPLAY[kind](value);
}

@Pipe({ name: 'enumName' })
export class EnumNamePipe implements PipeTransform {
  transform(value: number | string | null | undefined, kind: EnumKind): string {
    return enumName(kind, value);
  }
}
