import type { PartialMessage } from '@protobuf-ts/runtime';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import {
  CertificateResponse,
  CrlResponse,
  GetCrlRequest,
  RootsResponse,
} from 'src/services/trustyca/protogen/ca';
import {
  CertificateStatusResponse,
  GetCertificateInfoRequest,
  GetIssuerInfoRequest,
  GetRootsRequest,
  IssuerInfo,
} from 'src/services/trustyca/protogen/cis';
import { CISClient } from 'src/services/trustyca/protogen/cis.client';
import { unary } from './call';

/**
 * The Certificate Information Service: the public views of the CA for any
 * authenticated caller, without tenancy
 */
export interface ICisService {
  /** The public anchors of an org; '' for the platform anchors */
  getRoots(orgId?: string): Promise<RootsResponse>;
  getIssuer(req: PartialMessage<GetIssuerInfoRequest>): Promise<IssuerInfo>;
  getCertificate(req: PartialMessage<GetCertificateInfoRequest>): Promise<CertificateResponse>;
  getCertificateStatus(
    req: PartialMessage<GetCertificateInfoRequest>,
  ): Promise<CertificateStatusResponse>;
  getCRL(req: PartialMessage<GetCrlRequest>): Promise<CrlResponse>;
}

export class CisService implements ICisService {
  private readonly $rpc: CISClient;

  constructor(transport: RpcTransport) {
    this.$rpc = new CISClient(transport);
  }

  getRoots(orgId = ''): Promise<RootsResponse> {
    return unary('CisService: getRoots', GetRootsRequest.create({ OrgID: orgId }), (i, o) =>
      this.$rpc.getRoots(i, o),
    );
  }

  getIssuer(req: PartialMessage<GetIssuerInfoRequest>): Promise<IssuerInfo> {
    return unary('CisService: getIssuer', GetIssuerInfoRequest.create(req), (i, o) =>
      this.$rpc.getIssuer(i, o),
    );
  }

  getCertificate(req: PartialMessage<GetCertificateInfoRequest>): Promise<CertificateResponse> {
    return unary('CisService: getCertificate', GetCertificateInfoRequest.create(req), (i, o) =>
      this.$rpc.getCertificate(i, o),
    );
  }

  getCertificateStatus(
    req: PartialMessage<GetCertificateInfoRequest>,
  ): Promise<CertificateStatusResponse> {
    return unary(
      'CisService: getCertificateStatus',
      GetCertificateInfoRequest.create(req),
      (i, o) => this.$rpc.getCertificateStatus(i, o),
    );
  }

  getCRL(req: PartialMessage<GetCrlRequest>): Promise<CrlResponse> {
    return unary('CisService: getCRL', GetCrlRequest.create(req), (i, o) => this.$rpc.getCRL(i, o));
  }
}
