import type { PartialMessage } from '@protobuf-ts/runtime';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import {
  ActivateIssuerRequest,
  CertificateResponse,
  CertificatesResponse,
  CrlResponse,
  CrlsResponse,
  GetIssuerRequest,
  ImportIssuerRequest,
  IssuersResponse,
  ListIssuersRequest,
  ProfilesResponse,
  RegisterIssuerRequest,
  RegisterRootRequest,
  RevokedCertificateResponse,
  RevokedCertificatesResponse,
  RootsResponse,
  SummaryResponse,
  UpdateIssuerRequest,
} from 'src/services/trustyca/protogen/ca';
import {
  CertificateStatusResponse,
  GetCertificateInfoRequest,
  GetIssuerInfoRequest,
  IssuerInfo,
} from 'src/services/trustyca/protogen/cis';
import {
  AuthorityType_Enum,
  CertProfile,
  Issuer,
  IssuerConfig,
  IssuerStatus_Enum,
  RootCertificate,
  Trust_Enum,
  X509Subject,
} from 'src/services/trustyca/protogen/pkix';
import { ICaService } from 'src/services/trustyca/rpc/CaService';
import { ICisService } from 'src/services/trustyca/rpc/CisService';

export const CERT_PEM =
  '-----BEGIN CERTIFICATE-----\nMIIBszCCAVoCCQDqIssuingCA\n-----END CERTIFICATE-----';
export const ROOT_PEM =
  '-----BEGIN CERTIFICATE-----\nMIIBszCCAVoCCQDqRootCA\n-----END CERTIFICATE-----';
export const CSR_PEM =
  '-----BEGIN CERTIFICATE REQUEST-----\nMIIBszCCAVoCCQDqRequest\n-----END CERTIFICATE REQUEST-----';
export const KEY_PEM =
  '-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIAkey\n-----END EC PRIVATE KEY-----';

/** The runtime settings of the dev issuing CA */
export const ISSUER_CONFIG = IssuerConfig.create({
  AiaURL: 'http://localhost:8888/v1/cert/:ISSUER_ID',
  OcspURL: 'http://localhost:8888/v1/ocspi/:ISSUER_ID',
  CrlURL: 'http://localhost:8888/v1/crl/:ISSUER_ID',
  CrlExpiry: '48h',
  CrlRenewal: '12h',
  OcspExpiry: '1h',
  DelegatedOcspProfile: 'ocsp',
  AllowedProfiles: ['tenant_ca'],
  OmitDisabledExtensions: false,
});

/** An Active org-wide issuing CA, with the fields given */
export const issuer = (over: PartialMessage<Issuer> = {}): Issuer =>
  Issuer.create({
    ID: 'i1',
    OrgID: 'org1',
    ProjectID: '',
    Label: 'issuing',
    Type: AuthorityType_Enum.Issuing,
    Status: IssuerStatus_Enum.Active,
    ParentID: '',
    SKID: 'a1b2c3d4e5f6',
    IKID: 'f6e5d4c3b2a1',
    SerialNumber: '1234567890',
    Subject: 'CN=Acme Issuing CA, O=Acme',
    Issuer: 'CN=Trusty L1 CA, O=Trusty',
    Sha256: 'ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12',
    NotBefore: '2026-10-01T00:00:00Z',
    NotAfter: '2031-10-01T00:00:00Z',
    Certificate: CERT_PEM,
    Intermediates: '',
    Root: ROOT_PEM,
    Csr: '',
    KeyProvider: 'inmem',
    Config: IssuerConfig.create(ISSUER_CONFIG),
    Profiles: ['server', 'client'],
    CrlNumber: '3',
    CreatedAt: '2026-10-01T10:00:00Z',
    UpdatedAt: '2026-10-20T10:00:00Z',
    ...over,
  });

export const root = (
  id: string,
  subject: string,
  trust = Trust_Enum.Private,
  over: PartialMessage<RootCertificate> = {},
): RootCertificate =>
  RootCertificate.create({
    ID: id,
    OrgID: 'org1',
    SKID: '5b1d0' + (/\d+/.exec(id)?.[0] ?? '0'),
    NotBefore: '2026-01-01T00:00:00Z',
    NotAfter: '2046-01-01T00:00:00Z',
    Subject: subject,
    Sha256: 'ff' + id.repeat(10),
    Trust: trust,
    Pem: ROOT_PEM,
    CreatedAt: '2026-01-02T00:00:00Z',
    ...over,
  });

/** 'CN=x, O=y' of an X509Subject, as the server renders it */
export function subjectString(subject: PartialMessage<X509Subject> | undefined): string {
  if (!subject) {
    return '';
  }
  const parts = subject.CommonName ? [`CN=${subject.CommonName}`] : [];
  for (const n of subject.Names ?? []) {
    if (n.Organisation) {
      parts.push(`O=${n.Organisation}`);
    }
    if (n.OrganisationalUnit) {
      parts.push(`OU=${n.OrganisationalUnit}`);
    }
    if (n.Country) {
      parts.push(`C=${n.Country}`);
    }
  }
  return parts.join(', ');
}

const TRANSITIONS: Partial<Record<IssuerStatus_Enum, IssuerStatus_Enum>> = {
  [IssuerStatus_Enum.Active]: IssuerStatus_Enum.Archived,
  [IssuerStatus_Enum.Archived]: IssuerStatus_Enum.Destroyed,
};

/**
 * The CaService of the specs: the issuers and the roots of the org in
 * memory, with the rules of the server the pages rely on (a Pending issuer
 * for an external signature, the status transitions, the filters of
 * ListIssuers); the certificate, profile and CRL methods answer empty
 * messages until their phases.
 */
export class FakeCaService implements ICaService {
  issuers: Issuer[] = [
    issuer(),
    issuer({
      ID: 'i2',
      ProjectID: 'p1',
      Label: 'payments-root',
      Type: AuthorityType_Enum.Root,
      ParentID: '',
      SKID: 'root-p1',
      IKID: 'root-p1',
      Subject: 'CN=Payments Root CA, O=Acme',
      Issuer: 'CN=Payments Root CA, O=Acme',
      Certificate: ROOT_PEM,
      Root: ROOT_PEM,
      Profiles: ['payments-ca'],
      CrlNumber: '0',
    }),
    issuer({
      ID: 'i3',
      Label: 'external',
      Status: IssuerStatus_Enum.Pending,
      SKID: 'skid-ext',
      IKID: '',
      SerialNumber: '',
      Subject: 'CN=Externally Signed CA, O=Acme',
      Issuer: '',
      Sha256: '',
      NotBefore: '',
      NotAfter: '',
      Certificate: '',
      Root: '',
      Csr: CSR_PEM,
      Profiles: [],
      CrlNumber: '',
    }),
    issuer({
      ID: 'i4',
      Label: 'legacy',
      Status: IssuerStatus_Enum.Archived,
      SKID: 'skid-old',
      IKID: 'ikid-old',
      Subject: 'CN=Legacy Issuing CA, O=Acme',
      NotAfter: '2026-11-15T00:00:00Z',
      Profiles: [],
      CrlNumber: '41',
    }),
  ];
  roots: RootCertificate[] = [root('r1', 'CN=Payments Root CA, O=Acme')];
  private nextId = 10;

  listIssuers = vi.fn(async (req: PartialMessage<ListIssuersRequest>) => {
    const rows = this.issuers.filter(
      (i) =>
        (!req.ProjectID || i.ProjectID === req.ProjectID) &&
        (!req.Status || i.Status === req.Status) &&
        (!req.Type || i.Type === req.Type) &&
        (!req.IDs?.length || req.IDs.includes(i.ID)) &&
        (!req.IKIDs?.length || req.IKIDs.includes(i.IKID)),
    );
    return IssuersResponse.create({ Issuers: rows });
  });

  getIssuer = vi.fn(async (req: PartialMessage<GetIssuerRequest>) => {
    const i = this.issuers.find(
      (x) =>
        (req.ID && x.ID === req.ID) ||
        (req.Label && x.Label === req.Label) ||
        (req.IKID && x.IKID === req.IKID),
    );
    if (!i) {
      throw new RpcError('issuer not found', 'NOT_FOUND');
    }
    return i;
  });

  registerIssuer = vi.fn(async (req: PartialMessage<RegisterIssuerRequest>) => {
    if (this.issuers.some((i) => i.Label === req.Label && i.ProjectID === (req.ProjectID ?? ''))) {
      throw new RpcError(`issuer label "${req.Label}" is already in use`, 'FAILED_PRECONDITION');
    }
    const pending = req.Type !== AuthorityType_Enum.Root && !req.ParentID;
    const id = 'i' + this.nextId++;
    const created = issuer({
      ID: id,
      ProjectID: req.ProjectID ?? '',
      Label: req.Label ?? '',
      Type: req.Type ?? AuthorityType_Enum.Unknown,
      Status: pending ? IssuerStatus_Enum.Pending : IssuerStatus_Enum.Active,
      ParentID: req.ParentID ?? '',
      SKID: 'skid-' + id,
      IKID: pending ? '' : 'ikid-' + id,
      SerialNumber: pending ? '' : '99' + this.nextId,
      Subject: subjectString(req.Subject),
      Issuer: pending ? '' : 'CN=Parent CA',
      Sha256: pending ? '' : 'cc'.repeat(32),
      NotBefore: pending ? '' : '2026-10-31T00:00:00Z',
      NotAfter: pending ? '' : '2036-10-31T00:00:00Z',
      Certificate: pending ? '' : CERT_PEM,
      Root: pending ? '' : ROOT_PEM,
      Csr: pending ? CSR_PEM : '',
      KeyProvider: req.KeyProvider || 'inmem',
      Config: IssuerConfig.create(req.Config),
      Profiles: [],
      CrlNumber: '0',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    });
    this.issuers = [...this.issuers, created];
    return created;
  });

  importIssuer = vi.fn(async (req: PartialMessage<ImportIssuerRequest>) => {
    const id = 'i' + this.nextId++;
    const created = issuer({
      ID: id,
      ProjectID: req.ProjectID ?? '',
      Label: req.Label ?? '',
      Type: req.Type ?? AuthorityType_Enum.Unknown,
      SKID: 'skid-' + id,
      IKID: 'ikid-' + id,
      Subject: 'CN=Imported CA',
      Certificate: req.Certificate ?? '',
      Intermediates: req.Intermediates ?? '',
      Root: req.Root ?? '',
      KeyProvider: req.KeyURI ? 'pkcs11' : 'inmem',
      Config: IssuerConfig.create(req.Config),
      Profiles: [],
      CrlNumber: '0',
    });
    this.issuers = [...this.issuers, created];
    return created;
  });

  activateIssuer = vi.fn(async (req: PartialMessage<ActivateIssuerRequest>) => {
    const current = this.find(req.ID);
    if (current.Status !== IssuerStatus_Enum.Pending) {
      throw new RpcError('issuer is not pending', 'FAILED_PRECONDITION');
    }
    const activated = Issuer.create({
      ...current,
      Status: IssuerStatus_Enum.Active,
      IKID: 'ikid-' + current.ID,
      SerialNumber: '77' + current.ID,
      Issuer: 'CN=External Root CA',
      Certificate: req.Certificate ?? '',
      Intermediates: req.Intermediates ?? '',
      Root: req.Root ?? '',
      Csr: '',
      NotBefore: '2026-10-31T00:00:00Z',
      NotAfter: '2036-10-31T00:00:00Z',
      UpdatedAt: new Date().toISOString(),
    });
    this.replace(activated);
    return activated;
  });

  updateIssuer = vi.fn(async (req: PartialMessage<UpdateIssuerRequest>) => {
    const current = this.find(req.ID);
    let next = Issuer.create({ ...current, UpdatedAt: new Date().toISOString() });
    if (req.Status) {
      if (TRANSITIONS[current.Status] !== req.Status) {
        throw new RpcError(
          `issuer status ${IssuerStatus_Enum[current.Status]} cannot change to ${IssuerStatus_Enum[req.Status]}`,
          'FAILED_PRECONDITION',
        );
      }
      next = Issuer.create({ ...next, Status: req.Status });
    }
    if (req.Config) {
      next = Issuer.create({ ...next, Config: IssuerConfig.create(req.Config) });
    }
    this.replace(next);
    return next;
  });

  listRoots = vi.fn(async () => RootsResponse.create({ Roots: this.roots }));

  registerRoot = vi.fn(async (req: PartialMessage<RegisterRootRequest>) => {
    const id = 'r' + this.nextId++;
    const created = root(id, 'CN=Imported Root CA, O=Partner', req.Trust ?? Trust_Enum.Any, {
      Pem: req.Pem ?? '',
    });
    this.roots = [...this.roots, created];
    return created;
  });

  registerProfile = vi.fn(async () => CertProfile.create());
  getProfile = vi.fn(async () => CertProfile.create());
  listProfiles = vi.fn(async () => ProfilesResponse.create());
  deleteProfile = vi.fn(async () => undefined);
  signCertificate = vi.fn(async () => CertificateResponse.create());
  getCertificate = vi.fn(async () => CertificateResponse.create());
  listCertificates = vi.fn(async () => CertificatesResponse.create());
  updateCertificateLabel = vi.fn(async () => CertificateResponse.create());
  revokeCertificate = vi.fn(async () => RevokedCertificateResponse.create());
  listRevokedCertificates = vi.fn(async () => RevokedCertificatesResponse.create());
  getCRL = vi.fn(async () => CrlResponse.create());
  publishCrls = vi.fn(async () => CrlsResponse.create());
  getSummary = vi.fn(async () => SummaryResponse.create());

  private find(id: string | undefined): Issuer {
    const i = this.issuers.find((x) => x.ID === id);
    if (!i) {
      throw new RpcError('issuer not found', 'NOT_FOUND');
    }
    return i;
  }

  private replace(next: Issuer): void {
    this.issuers = this.issuers.map((x) => (x.ID === next.ID ? next : x));
  }
}

/** The CisService of the specs: the platform anchors, and empty lookups */
export class FakeCisService implements ICisService {
  platformRoots: RootCertificate[] = [
    root('pr1', 'CN=Trusty Root CA, O=Trusty', Trust_Enum.Private, { OrgID: '' }),
    root('pr2', 'CN=Trusty Public Root, O=Trusty', Trust_Enum.Public, { OrgID: '' }),
  ];

  getRoots = vi.fn(async (orgId = '') =>
    RootsResponse.create({ Roots: orgId ? [] : this.platformRoots }),
  );
  getIssuer = vi.fn(async (req: PartialMessage<GetIssuerInfoRequest>) =>
    IssuerInfo.create({ Label: 'issuing-' + req.IKID, Status: IssuerStatus_Enum.Active }),
  );
  getCertificate = vi.fn(async (req: PartialMessage<GetCertificateInfoRequest>) => {
    void req;
    return CertificateResponse.create();
  });
  getCertificateStatus = vi.fn(async () => CertificateStatusResponse.create());
  getCRL = vi.fn(async () => CrlResponse.create());
}
