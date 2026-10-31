import { Provider } from '@angular/core';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { Token, UserInfo } from 'src/models/Auth';
import { PlatformInfo } from 'src/services/AppPlatform';
import { AppUser } from 'src/services/AppUser';
import { RuntimeConfig } from 'src/services/runtimeConfig';
import { StorageService } from 'src/services/storage';
import {
  AuthProvidersResponse,
  CallerScope,
  MethodAccess,
  ServiceAccessInfo,
  Token as PbToken,
  UserTokenResponse,
} from 'src/services/trustyca/protogen/auth';
import {
  DeleteProjectRequest,
  EventsResponse,
  GetProjectRequest,
  ListProjectsRequest,
  Org,
  OrgAccess,
  Project,
  ProjectsResponse,
  RegisterProjectRequest,
  Role_Enum,
  RoleSource_Enum,
  UpdateOrgRequest,
  UpdateProjectRequest,
  UserMemberships,
  UserOrgsResponse,
} from 'src/services/trustyca/protogen/orgs';
import { ServerStatusResponse } from 'src/services/trustyca/protogen/status';
import { ItemStatus_Enum } from 'src/services/trustyca/protogen/types';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { AuthorizeOptions, IAuthService } from 'src/services/trustyca/rpc/AuthService';
import { IOrgsService } from 'src/services/trustyca/rpc/OrgsService';
import { IStatusService } from 'src/services/trustyca/rpc/StatusService';
import { FakeTransport } from 'src/services/trustyca/rpc/testing/fake-transport';
import { IAppPlatform } from 'src/types';
import {
  APP_PLATFORM,
  APP_USER,
  AUTH_SERVICE,
  ORGS_SERVICE,
  RPC_TRANSPORT,
  RUNTIME_CONFIG,
  STATUS_SERVICE,
  STORAGE,
} from '../core/api/tokens';

export const TEST_CONFIG: RuntimeConfig = {
  apiUrl: 'https://localhost:8880',
  loginResponseType: 'code',
  appVersion: 'test',
};

/** The storage prefix of the specs; clearStorage() empties it */
export const TEST_PREFIX = 'test_';

export function clearStorage(): void {
  localStorage.clear();
  sessionStorage.clear();
}

/** The public methods an Owner may call, as the fake caller scope allows them */
export const OWNER_METHODS = [
  '/pb.Orgs/GetOrg',
  '/pb.Orgs/UpdateOrg',
  '/pb.Orgs/DeleteOrg',
  '/pb.Orgs/ListProjects',
  '/pb.Orgs/RegisterProject',
  '/pb.Orgs/UpdateProject',
  '/pb.Orgs/DeleteProject',
  '/pb.Orgs/GetMembers',
  '/pb.Orgs/ListAPIKeys',
  '/pb.Orgs/ListEvents',
  '/pb.CA/ListIssuers',
  '/pb.CA/RegisterIssuer',
  '/pb.CA/ListCertificates',
  '/pb.CA/SignCertificate',
];

/** The MethodAccess rows of a caller scope that allows exactly these methods */
export const allowMethods = (...methods: string[]): MethodAccess[] =>
  methods.map((m) => MethodAccess.create({ Method: m, Allowed: true }));

/** A caller scope with an org-wide role that allows the methods, the Owner's by default */
export const callerScope = (
  role = Role_Enum.Owner,
  methods: readonly string[] = OWNER_METHODS,
): CallerScope =>
  CallerScope.create({
    OrgID: 'org1',
    Role: role,
    RoleSource: RoleSource_Enum.Direct,
    Methods: allowMethods(...methods),
  });

export const org = (id: string, name: string, role = Role_Enum.Owner): OrgAccess =>
  OrgAccess.create({
    OrgID: id,
    OrgName: name,
    OrgAlias: name.toLowerCase(),
    Role: role,
    RoleSource: RoleSource_Enum.Direct,
  });

/** Signs the user in with a bearer token of an hour, in the org when one is given */
export function signIn(
  user: AppUser,
  orgId = 'org1',
  role = 'Owner',
  expiresInMs = 3600_000,
): void {
  user.setToken(
    new Token(
      'jwt-test',
      'Bearer',
      new Date(Date.now() + expiresInMs),
      new Date(),
      'https://localhost:8880',
      '',
      'local',
    ),
    new UserInfo('42', 'User One', 'user1@trustyca.io', true, {}, orgId, orgId ? role : ''),
  );
}

export class FakePlatform implements IAppPlatform {
  readonly window = window;
  readonly appVersion = 'test';
  readonly isLocal = true;
  readonly isAndroid = false;
  readonly isCordova = false;
  readonly isEmbedded = false;
  readonly isiOS = false;
  readonly isOutlook = false;
  readonly userAgent = 'test';
  readonly locationHost = 'localhost';
  readonly locationUrl = 'http://localhost:4200';
  readonly deviceID = 'device-test';
  isNetworkOnline = true;
  isSinglePageView = false;
  openUrl = vi.fn<(url: string) => void>();
  redirect = vi.fn<(url: string) => void>();
  replaceHistoryUrl = vi.fn<(url: string) => void>();
}

/** The AuthService of the specs: answers from its fields and drives AppUser as the real one does */
export class FakeAuthService implements IAuthService {
  providers = AuthProvidersResponse.create({ AuthURL: '', ProviderNames: ['github', 'local'] });
  scope = callerScope();
  /** The org the profile of the next GetUserToken selects; '' for none */
  loginOrgId = 'org1';

  constructor(private readonly user: AppUser) {}

  getProviders = vi.fn(async (email?: string) => {
    void email;
    return this.providers;
  });
  authorizeUrl = vi.fn(
    async (opts: AuthorizeOptions) =>
      `https://localhost:8880/v1/auth/authorize?provider=${opts.provider ?? ''}`,
  );
  exchangeCode = vi.fn(async (code: string) => PbToken.create({ AccessToken: 'jwt-' + code }));
  getUserToken = vi.fn(async (accessToken?: string) => {
    void accessToken;
    signIn(this.user, this.loginOrgId);
    return UserTokenResponse.create();
  });
  selectOrg = vi.fn(async (orgId: string) => {
    signIn(this.user, orgId);
    return UserTokenResponse.create();
  });
  getCallerScope = vi.fn(async () => this.scope);
  getAllowedMethods = vi.fn(async () => ServiceAccessInfo.create());
  revokeToken = vi.fn(async () => undefined);
}

export const project = (id: string, name: string, status = ItemStatus_Enum.Active): Project =>
  Project.create({
    ID: id,
    OrgID: 'org1',
    Alias: name.toLowerCase(),
    Name: name,
    Status: status,
    CreatedAt: '2026-10-01T10:00:00Z',
  });

/**
 * The OrgsService of the specs: the user orgs, the org and its projects
 * (kept in memory, so a register, update or delete shows in the next list),
 * the memberships and the events
 */
export class FakeOrgsService implements Partial<IOrgsService> {
  orgs: OrgAccess[] = [org('org1', 'Acme'), org('org2', 'Globex', Role_Enum.Viewer)];
  org = Org.create({
    ID: 'org1',
    Name: 'Acme',
    Alias: 'acme',
    Description: 'Acme Corporation',
    Status: ItemStatus_Enum.Active,
    CreatedAt: '2026-09-01T09:00:00Z',
  });
  projects: Project[] = [
    project('p1', 'Payments'),
    project('p2', 'Web'),
    project('p3', 'Legacy', ItemStatus_Enum.Inactive),
  ];
  private nextProjectId = 10;

  getUserOrgs = vi.fn(async () => UserOrgsResponse.create({ Orgs: this.orgs }));
  getOrg = vi.fn(async () => this.org);
  updateOrg = vi.fn(async (req: PartialMessage<UpdateOrgRequest>) => {
    this.org = Org.create({
      ...this.org,
      Name: req.Name ?? this.org.Name,
      Description: req.Description ?? this.org.Description,
    });
    return this.org;
  });
  deleteOrg = vi.fn(async () => Org.create({ ...this.org, Status: ItemStatus_Enum.Inactive }));
  listProjects = vi.fn(async (req: PartialMessage<ListProjectsRequest>) => {
    void req;
    return ProjectsResponse.create({ Projects: this.projects });
  });
  getProject = vi.fn(async (req: PartialMessage<GetProjectRequest>) => {
    const p = this.projects.find((x) => x.ID === req.ProjectID || x.Alias === req.Alias);
    if (!p) {
      throw new RpcError('project not found', 'NOT_FOUND');
    }
    return p;
  });
  registerProject = vi.fn(async (req: PartialMessage<RegisterProjectRequest>) => {
    const p = Project.create({
      ID: 'p' + this.nextProjectId++,
      OrgID: 'org1',
      Alias: req.Alias ?? '',
      Name: req.Name ?? '',
      Description: req.Description ?? '',
      Status: ItemStatus_Enum.Active,
      CreatedAt: new Date().toISOString(),
    });
    this.projects = [...this.projects, p];
    return p;
  });
  updateProject = vi.fn(async (req: PartialMessage<UpdateProjectRequest>) => {
    const current = this.projects.find((x) => x.ID === req.ProjectID);
    if (!current) {
      throw new RpcError('project not found', 'NOT_FOUND');
    }
    const p = Project.create({
      ...current,
      Name: req.Name ?? '',
      Description: req.Description ?? '',
    });
    this.projects = this.projects.map((x) => (x.ID === p.ID ? p : x));
    return p;
  });
  deleteProject = vi.fn(async (req: PartialMessage<DeleteProjectRequest>) => {
    const current = this.projects.find((x) => x.ID === req.ProjectID);
    if (!current) {
      throw new RpcError('project not found', 'NOT_FOUND');
    }
    const p = Project.create({ ...current, Status: ItemStatus_Enum.Inactive });
    this.projects = this.projects.map((x) => (x.ID === p.ID ? p : x));
    return p;
  });
  listEvents = vi.fn(async () => EventsResponse.create());
  getUserMemberships = vi.fn(async () =>
    UserMemberships.create({ Org: this.orgs[0], Memberships: [] }),
  );
}

export interface TestApi {
  storage: StorageService;
  user: AppUser;
  platform: FakePlatform;
  auth: FakeAuthService;
  orgs: FakeOrgsService;
  status: IStatusService;
  transport: FakeTransport;
  providers: Provider[];
}

/**
 * The DI tokens of provideTrustyApi() with fakes behind them: the real
 * storage and AppUser over the browser storage of jsdom, fake services,
 * and the FakeTransport for the services of provideCaApi()
 */
export function createTestApi(config: Partial<RuntimeConfig> = {}): TestApi {
  const storage = new StorageService(new PlatformInfo('test', window), TEST_PREFIX);
  const user = new AppUser(storage, document);
  const platform = new FakePlatform();
  const auth = new FakeAuthService(user);
  const orgs = new FakeOrgsService();
  const status: IStatusService = {
    version: vi.fn(async () => ({ Build: 'v0.1.12-test', Runtime: 'go1.27' })),
    server: vi.fn(async () => ServerStatusResponse.create()),
  };
  const transport = new FakeTransport();
  return {
    storage,
    user,
    platform,
    auth,
    orgs,
    status,
    transport,
    providers: [
      { provide: RUNTIME_CONFIG, useValue: { ...TEST_CONFIG, ...config } },
      { provide: STORAGE, useValue: storage },
      { provide: APP_USER, useValue: user },
      { provide: APP_PLATFORM, useValue: platform },
      { provide: AUTH_SERVICE, useValue: auth },
      { provide: ORGS_SERVICE, useValue: orgs },
      { provide: STATUS_SERVICE, useValue: status },
      { provide: RPC_TRANSPORT, useValue: transport },
      // the menus and dialogs of the specs open and close at once
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  };
}
