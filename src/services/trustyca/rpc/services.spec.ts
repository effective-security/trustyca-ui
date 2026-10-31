import { CisService } from './CisService';
import { OrgsService } from './OrgsService';
import { StatusService } from './StatusService';
import { FakeTransport } from './testing/fake-transport';

/**
 * The contract of the thin services: every wrapper reaches the method of
 * its proto service, so a regeneration that renames one fails here
 */
describe('rpc services', () => {
  it('OrgsService reaches every method of pb.Orgs', async () => {
    const t = new FakeTransport();
    const orgs = new OrgsService(t);
    await orgs.registerOrg({ Name: 'Acme' });
    await orgs.getOrg();
    await orgs.updateOrg({ Name: 'Acme' });
    await orgs.deleteOrg();
    await orgs.getUserOrgs();
    await orgs.getUserMemberships();
    await orgs.getMembers({});
    await orgs.addMember({});
    await orgs.changeMemberRole({});
    await orgs.deleteMember({});
    await orgs.deleteInvite({});
    await orgs.registerProject({});
    await orgs.updateProject({});
    await orgs.getProject({});
    await orgs.listProjects({});
    await orgs.deleteProject({});
    await orgs.listEvents({ Limit: 20 });
    await orgs.createAPIKey({});
    await orgs.listAPIKeys({});
    await orgs.deleteAPIKey({});
    expect(new Set(t.calls.map((c) => c.service))).toEqual(new Set(['pb.Orgs']));
    expect(t.calls.map((c) => c.method)).toEqual([
      'RegisterOrg',
      'GetOrg',
      'UpdateOrg',
      'DeleteOrg',
      'GetUserOrgs',
      'GetUserMemberships',
      'GetMembers',
      'AddMember',
      'ChangeMemberRole',
      'DeleteMember',
      'DeleteInvite',
      'RegisterProject',
      'UpdateProject',
      'GetProject',
      'ListProjects',
      'DeleteProject',
      'ListEvents',
      'CreateAPIKey',
      'ListAPIKeys',
      'DeleteAPIKey',
    ]);
    expect(t.last('RegisterOrg')?.input).toMatchObject({ Name: 'Acme' });
    expect(t.last('ListEvents')?.input).toMatchObject({ Limit: 20, Cursor: '' });
  });

  it('CisService reaches every method of pb.CIS and asks for the platform roots by default', async () => {
    const t = new FakeTransport();
    const cis = new CisService(t);
    await cis.getRoots();
    expect(t.last('GetRoots')?.input).toMatchObject({ OrgID: '' });
    await cis.getIssuer({ IKID: 'k1' });
    await cis.getCertificate({});
    await cis.getCertificateStatus({});
    await cis.getCRL({});
    expect(t.calls.map((c) => `${c.service}/${c.method}`)).toEqual([
      'pb.CIS/GetRoots',
      'pb.CIS/GetIssuer',
      'pb.CIS/GetCertificate',
      'pb.CIS/GetCertificateStatus',
      'pb.CIS/GetCRL',
    ]);
  });

  it('StatusService reads the server version over gRPC-Web', async () => {
    const t = new FakeTransport().respond('Version', { Build: 'v0.1.12', Runtime: 'go1.27.2' });
    const status = new StatusService(t);
    expect(await status.version()).toEqual({ Build: 'v0.1.12', Runtime: 'go1.27.2' });
    await status.server();
    expect(t.calls.map((c) => `${c.service}/${c.method}`)).toEqual([
      'pb.Status/Version',
      'pb.Status/Server',
    ]);
  });
});
