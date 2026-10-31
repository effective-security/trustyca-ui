import { RpcError } from '@protobuf-ts/runtime-rpc';
import { Token, UserInfo } from 'src/models/Auth';
import { AppUser } from 'src/services/AppUser';
import { StorageService } from 'src/services/storage';
import { CaService, CaUnavailableError, isCaUnavailable, KEY_OPERATION_TIMEOUT } from './CaService';
import { FakeTransport } from './testing/fake-transport';

describe('CaService', () => {
  let user: AppUser;
  let transport: FakeTransport;
  let ca: CaService;

  beforeEach(() => {
    user = new AppUser(new StorageService());
    user.setToken(
      new Token('jwt', 'Bearer', new Date(Date.now() + 3600_000)),
      new UserInfo('42', 'u', 'u@x', true, {}, 'org1', 'Admin'),
    );
    transport = new FakeTransport();
    ca = new CaService(transport, user);
  });

  it('names the selected project in the list requests a page leaves open', async () => {
    user.setProjectId('p1');
    await ca.listIssuers({ Limit: 10 });
    expect(transport.last('ListIssuers')?.input).toMatchObject({ ProjectID: 'p1', Limit: 10 });

    await ca.listCertificates({ ProjectID: '' });
    expect(transport.last('ListCertificates')?.input).toMatchObject({ ProjectID: '' });

    await ca.listProfiles({ ProjectID: 'p2' });
    expect(transport.last('ListProfiles')?.input).toMatchObject({ ProjectID: 'p2' });

    await ca.listRevokedCertificates({});
    expect(transport.last('ListRevokedCertificates')?.input).toMatchObject({ ProjectID: 'p1' });

    await ca.publishCrls({ Force: true });
    expect(transport.last('PublishCrls')?.input).toMatchObject({ ProjectID: 'p1', Force: true });

    await ca.getSummary({});
    expect(transport.last('GetSummary')?.input).toMatchObject({ ProjectID: 'p1' });
    expect(transport.last('GetSummary')?.options.timeout).toBeUndefined();
  });

  it('leaves the scope of a create, revoke or lookup to the page', async () => {
    user.setProjectId('p1');
    await ca.registerIssuer({ Label: 'issuing' });
    await ca.signCertificate({ Profile: 'server' });
    await ca.revokeCertificate({ ID: 'c1' });
    await ca.getIssuer({ ID: 'i1' });
    for (const m of ['RegisterIssuer', 'SignCertificate', 'RevokeCertificate', 'GetIssuer']) {
      expect(transport.last(m)?.input).toMatchObject({ ProjectID: '' });
    }
  });

  it('gives the key operations the longer deadline and the reads the default', async () => {
    await ca.registerIssuer({});
    await ca.importIssuer({});
    await ca.activateIssuer({});
    await ca.updateIssuer({});
    await ca.signCertificate({});
    await ca.publishCrls({});
    for (const m of [
      'RegisterIssuer',
      'ImportIssuer',
      'ActivateIssuer',
      'UpdateIssuer',
      'SignCertificate',
      'PublishCrls',
    ]) {
      expect(transport.last(m)?.options.timeout).toBe(KEY_OPERATION_TIMEOUT);
    }
    await ca.listIssuers({});
    expect(transport.last('ListIssuers')?.options.timeout).toBeUndefined();
  });

  it('reports an unreachable CA as CaUnavailableError and passes other failures through', async () => {
    transport.respond('ListIssuers', new RpcError('CA is not available', 'UNAVAILABLE'));
    const err = await ca.listIssuers({}).catch((e: unknown) => e);
    expect(isCaUnavailable(err)).toBe(true);
    expect(err).toBeInstanceOf(CaUnavailableError);
    expect((err as RpcError).serviceName).toBe('pb.CA');
    expect((err as RpcError).methodName).toBe('ListIssuers');

    transport.respond('GetIssuer', new RpcError('issuer not found', 'NOT_FOUND'));
    const notFound = await ca.getIssuer({ ID: 'x' }).catch((e: unknown) => e);
    expect(isCaUnavailable(notFound)).toBe(false);
    expect((notFound as RpcError).code).toBe('NOT_FOUND');
  });

  it('reaches every method of pb.CA the console uses', async () => {
    await ca.registerRoot({});
    await ca.listRoots({});
    await ca.registerProfile({});
    await ca.getProfile({});
    await ca.deleteProfile({});
    await ca.getCertificate({});
    await ca.updateCertificateLabel({});
    await ca.getCRL({});
    expect(new Set(transport.calls.map((c) => c.service))).toEqual(new Set(['pb.CA']));
    expect(transport.calls.map((c) => c.method)).toEqual([
      'RegisterRoot',
      'ListRoots',
      'RegisterProfile',
      'GetProfile',
      'DeleteProfile',
      'GetCertificate',
      'UpdateCertificateLabel',
      'GetCRL',
    ]);
  });
});
