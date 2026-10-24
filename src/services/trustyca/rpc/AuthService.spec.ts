import { RpcError } from '@protobuf-ts/runtime-rpc';
import { Token } from 'src/models/Auth';
import { PlatformInfo } from 'src/services/AppPlatform/PlatformInfo';
import { AppUser, COOKIE_TOKEN_TYPE } from 'src/services/AppUser';
import { RuntimeConfig } from 'src/services/runtimeConfig';
import { PERSISTED_OTC_BINDING, StorageService } from 'src/services/storage';
import { IDP_Enum, UserTokenResponse } from 'src/services/trustyca/protogen/auth';
import { authInterceptor } from 'src/services/trustyca/transport';
import { AuthService, PATH_AUTH_ORG, PATH_REVOKE_TOKEN } from './AuthService';
import { FakeTransport } from './testing/fake-transport';

const API = 'https://localhost:8880';
const exp = () => new Date(Date.now() + 3600_000).toISOString();

const userToken = (accessToken: string, orgId = 'org1'): Partial<UserTokenResponse> => ({
  Token: {
    TokenType: 'Bearer',
    AccessToken: accessToken,
    Jkt: '',
    ExpiresAt: exp(),
    IssuedAt: new Date().toISOString(),
    Issuer: API,
    Audience: API,
    Provider: IDP_Enum.Local,
    ExpiresIn: 0,
  },
  UserInfo: {
    ID: '42',
    Name: 'user1',
    Email: 'user1@trustyca.io',
    EmailVerified: true,
    Role: 'user',
    Orgs: {},
    OrgID: orgId,
    OrgRole: 'Owner',
    OrgRoleSource: 'direct',
  },
});

function jsonResponse(
  status: number,
  body?: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('AuthService', () => {
  const platform = new PlatformInfo('test', window);
  let storage: StorageService;
  let user: AppUser;
  let transport: FakeTransport;
  let fetchFn: ReturnType<typeof vi.fn<typeof fetch>>;

  const service = (mode: RuntimeConfig['loginResponseType'] = 'code') =>
    new AuthService(
      transport,
      user,
      { apiUrl: API, loginResponseType: mode, appVersion: '' },
      'device-1',
      fetchFn,
    );

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storage = new StorageService(platform, 'h_');
    user = new AppUser(storage, { cookie: 'avn_trustyca_csrf_token=csrf-1' });
    transport = new FakeTransport({ interceptors: [authInterceptor(user)] });
    fetchFn = vi.fn<typeof fetch>();
  });

  it('builds the authorize URL of a bearer login with PKCE', async () => {
    const url = new URL(
      await service().authorizeUrl({
        provider: 'local',
        email: ' Local+User1@Trustyca.io ',
        rememberMe: true,
        redirectUri: 'http://localhost:4200/auth/authenticated',
      }),
    );
    expect(url.origin + url.pathname).toBe(API + '/v1/auth/authorize');
    const q = url.searchParams;
    expect(q.get('client_id')).toBe('trustyca');
    expect(q.get('provider')).toBe('local');
    expect(q.get('response_type')).toBe('code');
    expect(q.get('response_mode')).toBe('query');
    expect(q.get('redirect_uri')).toBe('http://localhost:4200/auth/authenticated');
    expect(q.get('idpuser.email')).toBe('local+user1@trustyca.io');
    expect(q.get('login_hint')).toBe('local+user1@trustyca.io');
    expect(q.get('remember_me')).toBe('true');
    expect(q.get('device_id')).toBe('device-1');
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(q.get('nonce')).toHaveLength(32);
    expect(sessionStorage.getItem('h_' + PERSISTED_OTC_BINDING)).toHaveLength(64);
  });

  it('builds the authorize URL of a cookie login without PKCE', async () => {
    const q = new URL(
      await service('cookie').authorizeUrl({
        provider: 'github',
        loginHint: 'user1@trustyca.io',
        rememberMe: false,
        redirectUri: 'https://app.local.trustyca.io:4200/auth/authenticated',
      }),
    ).searchParams;
    expect(q.get('response_type')).toBe('cookie');
    expect(q.get('code_challenge')).toBeNull();
    expect(q.get('idpuser.email')).toBeNull();
    expect(q.get('login_hint')).toBe('user1@trustyca.io');
  });

  it('exchanges the code with the stored verifier, once', async () => {
    const svc = service();
    await svc.authorizeUrl({
      rememberMe: false,
      redirectUri: 'http://localhost:4200/auth/authenticated',
    });
    const verifier = sessionStorage.getItem('h_' + PERSISTED_OTC_BINDING);
    transport.respond('ExchangeCode', { AccessToken: 'jwt-1', ExpiresIn: 172800 });

    const token = await svc.exchangeCode('otc-1');
    expect(token.AccessToken).toBe('jwt-1');
    expect(transport.last('ExchangeCode')?.input).toEqual({ Code: 'otc-1', Verifier: verifier });
    await expect(svc.exchangeCode('otc-1')).rejects.toThrow(/another tab/);
  });

  it('loads the bearer profile with the exchanged token and stores it', async () => {
    transport.respond('GetUserToken', userToken('jwt-1'));
    await service().getUserToken('jwt-1');

    expect(transport.last('GetUserToken')?.options.meta).toMatchObject({
      authorization: 'Bearer jwt-1',
    });
    expect(user.isAuthenticated).toBe(true);
    expect(user.token.AccessToken).toBe('jwt-1');
    expect(user.token.TokenType).toBe('Bearer');
    expect(user.token.Provider).toBe('local');
    expect(user.profile.OrgID).toBe('org1');
    expect(user.profile.OrgRole).toBe('Owner');
  });

  it('loads the cookie profile with the CSRF header and keeps no token', async () => {
    user.setCsrfTokenName('avn_trustyca_csrf_token');
    transport.respond('GetUserToken', userToken(''));
    await service('cookie').getUserToken();

    const meta = transport.last('GetUserToken')?.options.meta;
    expect(meta).toMatchObject({ 'x-csrf-token': 'csrf-1' });
    expect(meta?.['authorization']).toBeUndefined();
    expect(user.isCookieSession).toBe(true);
    expect(user.token.TokenType).toBe(COOKIE_TOKEN_TYPE);
    expect(user.token.AccessToken).toBe('');
    expect(user.rpcMetadata()).toEqual({ 'x-csrf-token': 'csrf-1' });
  });

  it('switches the org of a bearer session over gRPC', async () => {
    user.setToken(new Token('jwt-1', 'Bearer', exp()), {
      ID: '42',
      Name: 'u',
      Email: 'u@x',
      EmailVerified: true,
    });
    transport.respond('SelectOrg', userToken('jwt-2', 'org2'));

    await service().selectOrg('org2', true);
    const call = transport.last('SelectOrg');
    expect(call?.input).toEqual({ OrgID: 'org2', RememberMe: true });
    expect(call?.options.meta).toMatchObject({ authorization: 'Bearer jwt-1' });
    expect(user.token.AccessToken).toBe('jwt-2');
    expect(user.orgId).toBe('org2');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('switches the org of a cookie session over REST, which replaces the cookies', async () => {
    user.setCsrfTokenName('avn_trustyca_csrf_token');
    user.setToken(new Token('', COOKIE_TOKEN_TYPE, exp()), {
      ID: '42',
      Name: 'u',
      Email: 'u@x',
      EmailVerified: true,
    });
    fetchFn.mockResolvedValue(
      jsonResponse(200, UserTokenResponse.toJson(UserTokenResponse.create(userToken('', 'org2')))),
    );

    await service('cookie').selectOrg('org2');
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(API + PATH_AUTH_ORG);
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(init?.headers).toMatchObject({
      'X-CSRF-Token': 'csrf-1',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init?.body))).toEqual({ OrgID: 'org2' });
    expect(user.isCookieSession).toBe(true);
    expect(user.orgId).toBe('org2');
    expect(transport.calls).toHaveLength(0);
  });

  it('maps a failed REST org switch to the gRPC code', async () => {
    user.setToken(new Token('', COOKIE_TOKEN_TYPE, exp()), {
      ID: '42',
      Name: 'u',
      Email: 'u@x',
      EmailVerified: true,
    });
    fetchFn.mockResolvedValue(
      jsonResponse(
        403,
        { code: 'forbidden', message: 'no access to the requested organization' },
        { 'X-Correlation-ID': 'c1' },
      ),
    );
    const err = await service('cookie')
      .selectOrg('org9')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RpcError);
    expect((err as RpcError).code).toBe('PERMISSION_DENIED');
    expect((err as RpcError).message).toBe('no access to the requested organization');
    expect((err as RpcError).meta).toEqual({ 'x-correlation-id': 'c1' });
  });

  it('expires a cookie session the org switch finds refused, not one denied the org', async () => {
    user.setCsrfTokenName('avn_trustyca_csrf_token');
    user.setToken(new Token('', COOKIE_TOKEN_TYPE, exp()), {
      ID: '42',
      Name: 'u',
      Email: 'u@x',
      EmailVerified: true,
    });
    fetchFn.mockResolvedValueOnce(
      jsonResponse(403, { message: 'no access to the requested organization' }),
    );
    await expect(service('cookie').selectOrg('org9')).rejects.toThrow('no access');
    expect(user.isAuthenticated).toBe(true);

    fetchFn.mockResolvedValueOnce(jsonResponse(401, { message: 'invalid user' }));
    await expect(service('cookie').selectOrg('org2')).rejects.toThrow('invalid user');
    expect(user.isAuthenticated).toBe(false);
    expect(user.sessionExpired).toBe(true);
  });

  it('revokes a bearer token over gRPC and a cookie session over REST', async () => {
    user.setToken(new Token('jwt-1', 'Bearer', exp()), {
      ID: '42',
      Name: 'u',
      Email: 'u@x',
      EmailVerified: true,
    });
    await service().revokeToken();
    expect(transport.last('RevokeToken')?.options.meta).toMatchObject({
      authorization: 'Bearer jwt-1',
    });

    user.setCsrfTokenName('avn_trustyca_csrf_token');
    user.setToken(new Token('', COOKIE_TOKEN_TYPE, exp()), {
      ID: '42',
      Name: 'u',
      Email: 'u@x',
      EmailVerified: true,
    });
    fetchFn.mockResolvedValue(new Response(null, { status: 204 }));
    await service('cookie').revokeToken();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(API + PATH_REVOKE_TOKEN);
    expect(init?.method).toBe('DELETE');
    expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-1' });
    expect(transport.calls.filter((c) => c.method === 'RevokeToken')).toHaveLength(1);
  });

  it('asks for the providers of an email and the caller scope', async () => {
    transport.respond('GetProviders', {
      AuthURL: API + '/v1/auth/authorize',
      ProviderNames: ['local'],
    });
    expect((await service().getProviders(' local+user1@trustyca.io ')).ProviderNames).toEqual([
      'local',
    ]);
    expect(transport.last('GetProviders')?.input).toEqual({ Email: 'local+user1@trustyca.io' });

    transport.respond('GetCallerScope', {
      OrgID: 'org1',
      Methods: [{ Method: '/pb.CA/ListIssuers', AllowedRoles: [], Scopes: [], Allowed: true }],
    });
    expect((await service().getCallerScope()).Methods[0].Allowed).toBe(true);
    await service().getAllowedMethods();
    expect(transport.last('GetAllowedMethods')?.service).toBe('pb.Auth');
  });
});
