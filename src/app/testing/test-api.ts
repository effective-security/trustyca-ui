import { Provider } from '@angular/core';
import { Token, UserInfo } from 'src/models/Auth';
import { PlatformInfo } from 'src/services/AppPlatform';
import { AppUser } from 'src/services/AppUser';
import { RuntimeConfig } from 'src/services/runtimeConfig';
import { StorageService } from 'src/services/storage';
import {
  AuthProvidersResponse,
  CallerScope,
  ServiceAccessInfo,
  Token as PbToken,
  UserTokenResponse,
} from 'src/services/trustyca/protogen/auth';
import {
  Org,
  OrgAccess,
  Role_Enum,
  RoleSource_Enum,
  UserMemberships,
  UserOrgsResponse,
} from 'src/services/trustyca/protogen/orgs';
import { ServerStatusResponse } from 'src/services/trustyca/protogen/status';
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
  scope = CallerScope.create({ OrgID: 'org1', Role: Role_Enum.Owner });
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

/** The OrgsService of the specs: the user orgs, the org and the memberships */
export class FakeOrgsService implements Partial<IOrgsService> {
  orgs: OrgAccess[] = [org('org1', 'Acme'), org('org2', 'Globex', Role_Enum.Viewer)];

  getUserOrgs = vi.fn(async () => UserOrgsResponse.create({ Orgs: this.orgs }));
  getOrg = vi.fn(async () => Org.create({ ID: 'org1', Name: 'Acme', Alias: 'acme' }));
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
    ],
  };
}
