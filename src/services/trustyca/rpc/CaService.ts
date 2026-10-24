import type { PartialMessage } from '@protobuf-ts/runtime';
import {
  RpcError,
  type RpcOptions,
  type RpcTransport,
  type UnaryCall,
} from '@protobuf-ts/runtime-rpc';
import {
  ActivateIssuerRequest,
  CertificateResponse,
  CertificatesResponse,
  CrlResponse,
  CrlsResponse,
  DeleteProfileRequest,
  GetCertificateRequest,
  GetCrlRequest,
  GetIssuerRequest,
  GetProfileRequest,
  ImportIssuerRequest,
  IssuersResponse,
  ListCertificatesRequest,
  ListIssuersRequest,
  ListProfilesRequest,
  ListRevokedCertificatesRequest,
  ListRootsRequest,
  ProfilesResponse,
  PublishCrlsRequest,
  RegisterIssuerRequest,
  RegisterProfileRequest,
  RegisterRootRequest,
  RevokeCertificateRequest,
  RevokedCertificateResponse,
  RevokedCertificatesResponse,
  RootsResponse,
  SignCertificateRequest,
  UpdateCertificateLabelRequest,
  UpdateIssuerRequest,
} from 'src/services/trustyca/protogen/ca';
import { CAClient } from 'src/services/trustyca/protogen/ca.client';
import { CertProfile, Issuer, RootCertificate } from 'src/services/trustyca/protogen/pkix';
import { IAppUser } from 'src/types';
import { unary } from './call';
import { CaUnavailableError } from './errors';

export { CaUnavailableError, isCaUnavailable } from './errors';

/**
 * The deadline of the key operations: the wfe forwards them to the signing
 * plane, where a crypto provider may take seconds to generate a key or
 * sign. The server's own request timeout bounds it too (BE-7).
 */
export const KEY_OPERATION_TIMEOUT = 60_000;

/**
 * The CA of the tenant on the wfe, which forwards every call to the
 * signing plane with the org of the token: requests carry no org.
 * The list requests and PublishCrls take the project selection when the
 * page names no ProjectID (an explicit '' asks for every project); the
 * create, revoke and label requests name their project themselves.
 */
export interface ICaService {
  registerIssuer(req: PartialMessage<RegisterIssuerRequest>): Promise<Issuer>;
  updateIssuer(req: PartialMessage<UpdateIssuerRequest>): Promise<Issuer>;
  importIssuer(req: PartialMessage<ImportIssuerRequest>): Promise<Issuer>;
  activateIssuer(req: PartialMessage<ActivateIssuerRequest>): Promise<Issuer>;
  getIssuer(req: PartialMessage<GetIssuerRequest>): Promise<Issuer>;
  listIssuers(req: PartialMessage<ListIssuersRequest>): Promise<IssuersResponse>;
  registerRoot(req: PartialMessage<RegisterRootRequest>): Promise<RootCertificate>;
  listRoots(req: PartialMessage<ListRootsRequest>): Promise<RootsResponse>;
  registerProfile(req: PartialMessage<RegisterProfileRequest>): Promise<CertProfile>;
  getProfile(req: PartialMessage<GetProfileRequest>): Promise<CertProfile>;
  listProfiles(req: PartialMessage<ListProfilesRequest>): Promise<ProfilesResponse>;
  deleteProfile(req: PartialMessage<DeleteProfileRequest>): Promise<void>;
  signCertificate(req: PartialMessage<SignCertificateRequest>): Promise<CertificateResponse>;
  getCertificate(req: PartialMessage<GetCertificateRequest>): Promise<CertificateResponse>;
  listCertificates(req: PartialMessage<ListCertificatesRequest>): Promise<CertificatesResponse>;
  updateCertificateLabel(
    req: PartialMessage<UpdateCertificateLabelRequest>,
  ): Promise<CertificateResponse>;
  revokeCertificate(
    req: PartialMessage<RevokeCertificateRequest>,
  ): Promise<RevokedCertificateResponse>;
  listRevokedCertificates(
    req: PartialMessage<ListRevokedCertificatesRequest>,
  ): Promise<RevokedCertificatesResponse>;
  getCRL(req: PartialMessage<GetCrlRequest>): Promise<CrlResponse>;
  publishCrls(req: PartialMessage<PublishCrlsRequest>): Promise<CrlsResponse>;
}

const keyOperation: RpcOptions = { timeout: KEY_OPERATION_TIMEOUT };

export class CaService implements ICaService {
  private readonly $rpc: CAClient;

  constructor(
    transport: RpcTransport,
    private readonly user: IAppUser,
  ) {
    this.$rpc = new CAClient(transport);
  }

  registerIssuer(req: PartialMessage<RegisterIssuerRequest>): Promise<Issuer> {
    return this.call(
      'registerIssuer',
      RegisterIssuerRequest.create(req),
      (i, o) => this.$rpc.registerIssuer(i, o),
      keyOperation,
    );
  }

  updateIssuer(req: PartialMessage<UpdateIssuerRequest>): Promise<Issuer> {
    return this.call(
      'updateIssuer',
      UpdateIssuerRequest.create(req),
      (i, o) => this.$rpc.updateIssuer(i, o),
      keyOperation,
    );
  }

  importIssuer(req: PartialMessage<ImportIssuerRequest>): Promise<Issuer> {
    return this.call(
      'importIssuer',
      ImportIssuerRequest.create(req),
      (i, o) => this.$rpc.importIssuer(i, o),
      keyOperation,
    );
  }

  activateIssuer(req: PartialMessage<ActivateIssuerRequest>): Promise<Issuer> {
    return this.call(
      'activateIssuer',
      ActivateIssuerRequest.create(req),
      (i, o) => this.$rpc.activateIssuer(i, o),
      keyOperation,
    );
  }

  getIssuer(req: PartialMessage<GetIssuerRequest>): Promise<Issuer> {
    return this.call('getIssuer', GetIssuerRequest.create(req), (i, o) =>
      this.$rpc.getIssuer(i, o),
    );
  }

  listIssuers(req: PartialMessage<ListIssuersRequest>): Promise<IssuersResponse> {
    return this.call('listIssuers', ListIssuersRequest.create(this.withProject(req)), (i, o) =>
      this.$rpc.listIssuers(i, o),
    );
  }

  registerRoot(req: PartialMessage<RegisterRootRequest>): Promise<RootCertificate> {
    return this.call('registerRoot', RegisterRootRequest.create(req), (i, o) =>
      this.$rpc.registerRoot(i, o),
    );
  }

  listRoots(req: PartialMessage<ListRootsRequest>): Promise<RootsResponse> {
    return this.call('listRoots', ListRootsRequest.create(req), (i, o) =>
      this.$rpc.listRoots(i, o),
    );
  }

  registerProfile(req: PartialMessage<RegisterProfileRequest>): Promise<CertProfile> {
    return this.call('registerProfile', RegisterProfileRequest.create(req), (i, o) =>
      this.$rpc.registerProfile(i, o),
    );
  }

  getProfile(req: PartialMessage<GetProfileRequest>): Promise<CertProfile> {
    return this.call('getProfile', GetProfileRequest.create(req), (i, o) =>
      this.$rpc.getProfile(i, o),
    );
  }

  listProfiles(req: PartialMessage<ListProfilesRequest>): Promise<ProfilesResponse> {
    return this.call('listProfiles', ListProfilesRequest.create(this.withProject(req)), (i, o) =>
      this.$rpc.listProfiles(i, o),
    );
  }

  async deleteProfile(req: PartialMessage<DeleteProfileRequest>): Promise<void> {
    await this.call('deleteProfile', DeleteProfileRequest.create(req), (i, o) =>
      this.$rpc.deleteProfile(i, o),
    );
  }

  signCertificate(req: PartialMessage<SignCertificateRequest>): Promise<CertificateResponse> {
    return this.call(
      'signCertificate',
      SignCertificateRequest.create(req),
      (i, o) => this.$rpc.signCertificate(i, o),
      keyOperation,
    );
  }

  getCertificate(req: PartialMessage<GetCertificateRequest>): Promise<CertificateResponse> {
    return this.call('getCertificate', GetCertificateRequest.create(req), (i, o) =>
      this.$rpc.getCertificate(i, o),
    );
  }

  listCertificates(req: PartialMessage<ListCertificatesRequest>): Promise<CertificatesResponse> {
    return this.call(
      'listCertificates',
      ListCertificatesRequest.create(this.withProject(req)),
      (i, o) => this.$rpc.listCertificates(i, o),
    );
  }

  updateCertificateLabel(
    req: PartialMessage<UpdateCertificateLabelRequest>,
  ): Promise<CertificateResponse> {
    return this.call('updateCertificateLabel', UpdateCertificateLabelRequest.create(req), (i, o) =>
      this.$rpc.updateCertificateLabel(i, o),
    );
  }

  revokeCertificate(
    req: PartialMessage<RevokeCertificateRequest>,
  ): Promise<RevokedCertificateResponse> {
    return this.call('revokeCertificate', RevokeCertificateRequest.create(req), (i, o) =>
      this.$rpc.revokeCertificate(i, o),
    );
  }

  listRevokedCertificates(
    req: PartialMessage<ListRevokedCertificatesRequest>,
  ): Promise<RevokedCertificatesResponse> {
    return this.call(
      'listRevokedCertificates',
      ListRevokedCertificatesRequest.create(this.withProject(req)),
      (i, o) => this.$rpc.listRevokedCertificates(i, o),
    );
  }

  getCRL(req: PartialMessage<GetCrlRequest>): Promise<CrlResponse> {
    return this.call('getCRL', GetCrlRequest.create(req), (i, o) => this.$rpc.getCRL(i, o));
  }

  publishCrls(req: PartialMessage<PublishCrlsRequest>): Promise<CrlsResponse> {
    return this.call(
      'publishCrls',
      PublishCrlsRequest.create(this.withProject(req)),
      (i, o) => this.$rpc.publishCrls(i, o),
      keyOperation,
    );
  }

  /** Names the selected project when the request names none */
  private withProject<T extends { ProjectID?: string }>(req: T): T {
    return req.ProjectID === undefined ? { ...req, ProjectID: this.user.projectId } : req;
  }

  private async call<I extends object, O extends object>(
    method: string,
    input: I,
    fn: (input: I, options?: RpcOptions) => UnaryCall<I, O>,
    options?: RpcOptions,
  ): Promise<O> {
    try {
      return await unary('CaService: ' + method, input, fn, options);
    } catch (err) {
      if (err instanceof RpcError && err.code === 'UNAVAILABLE') {
        throw new CaUnavailableError(err);
      }
      throw err;
    }
  }
}
