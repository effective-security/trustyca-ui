import { ItemStatus_Enum } from 'src/services/trustyca/protogen/types';
import { CertificateStatus_Enum, IssuerStatus_Enum } from 'src/services/trustyca/protogen/pkix';

/**
 * The color families of the console (DESIGN.md section 11): the same tone
 * names drive chips, tiles and charts
 */
export type StatusTone =
  'active' | 'pending' | 'archived' | 'destroyed' | 'revoked' | 'expired' | 'neutral';

export function issuerStatusTone(status: IssuerStatus_Enum): StatusTone {
  switch (status) {
    case IssuerStatus_Enum.Active:
      return 'active';
    case IssuerStatus_Enum.Pending:
      return 'pending';
    case IssuerStatus_Enum.Archived:
      return 'archived';
    case IssuerStatus_Enum.Destroyed:
      return 'destroyed';
    default:
      return 'neutral';
  }
}

export function certificateStatusTone(status: CertificateStatus_Enum): StatusTone {
  switch (status) {
    case CertificateStatus_Enum.Active:
      return 'active';
    case CertificateStatus_Enum.Revoked:
      return 'revoked';
    case CertificateStatus_Enum.Expired:
      return 'expired';
    default:
      return 'neutral';
  }
}

export function itemStatusTone(status: ItemStatus_Enum): StatusTone {
  switch (status) {
    case ItemStatus_Enum.Active:
      return 'active';
    case ItemStatus_Enum.Inactive:
      return 'archived';
    case ItemStatus_Enum.Invalid:
      return 'destroyed';
    default:
      return 'neutral';
  }
}
