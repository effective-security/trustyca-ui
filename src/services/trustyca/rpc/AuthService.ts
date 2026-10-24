import type { JsonValue } from '@protobuf-ts/runtime';
import type { RpcMetadata, RpcTransport } from '@protobuf-ts/runtime-rpc';
import { randomString } from 'src/libts/strings';
import { Token, UserInfo } from 'src/models/Auth';
import { COOKIE_TOKEN_TYPE } from 'src/services/AppUser';
import { RuntimeConfig } from 'src/services/runtimeConfig';
import {
  AuthProvidersRequest,
  AuthProvidersResponse,
  CallerScope,
  ExchangeCodeRequest,
  SelectOrgRequest,
  ServiceAccessInfo,
  Token as PbToken,
  UserTokenResponse,
} from 'src/services/trustyca/protogen/auth';
import { AuthClient } from 'src/services/trustyca/protogen/auth.client';
import { Empty } from 'src/services/trustyca/protogen/google/protobuf/empty';
import { getIDPDisplayName } from 'src/services/trustyca/rpc/enums';
import { expireRefusedSession } from 'src/services/trustyca/transport';
import { IAppUser } from 'src/types';
import { unary } from './call';
import { restCall } from './rest';

export type { AuthProvidersResponse, CallerScope, ServiceAccessInfo, UserTokenResponse };

/** The OAuth client of the console, the one the server accepts */
export const OAUTH_CLIENT_ID = 'trustyca';
export const PATH_AUTHORIZE = '/v1/auth/authorize';
/** The org switch of a cookie session, which replaces the cookies (BE-2) */
export const PATH_AUTH_ORG = '/v1/auth/org';
/** The sign-out of a cookie session, which revokes the token and removes the cookies */
export const PATH_REVOKE_TOKEN = '/pb.Auth/RevokeToken';

export interface AuthorizeOptions {
  /** The provider name of AuthProvidersResponse.ProviderNames */
  provider?: string;
  /**
   * The address to sign in as (`idpuser.email`): the server picks the
   * provider of its domain when no provider is given, refuses a login of
   * another address, and the `local` provider signs it in
   */
  email?: string;
  /** A hint for the identity provider only (`login_hint`) */
  loginHint?: string;
  rememberMe: boolean;
  /** The landing route of the console, `<origin>/auth/authenticated` */
  redirectUri: string;
}

export interface IAuthService {
  getProviders(email?: string): Promise<AuthProvidersResponse>;
  /** Builds the authorize URL of the server, with PKCE in bearer mode */
  authorizeUrl(opts: AuthorizeOptions): Promise<string>;
  /** Exchanges the one-time code of the landing for a token */
  exchangeCode(code: string): Promise<PbToken>;
  /**
   * Loads the token and the profile and stores them in AppUser: with the
   * token of an exchange, with the cookie in cookie mode, else with the
   * current session
   */
  getUserToken(accessToken?: string): Promise<UserTokenResponse>;
  /** Switches the session to the org and stores the new token in AppUser */
  selectOrg(orgId: string, rememberMe?: boolean): Promise<UserTokenResponse>;
  getCallerScope(): Promise<CallerScope>;
  getAllowedMethods(): Promise<ServiceAccessInfo>;
  /** Revokes the token of the session; a cookie session also loses its cookies */
  revokeToken(): Promise<void>;
}

export class AuthService implements IAuthService {
  private readonly $rpc: AuthClient;

  constructor(
    transport: RpcTransport,
    private readonly user: IAppUser,
    private readonly config: RuntimeConfig,
    private readonly deviceId: string,
    private readonly fetchFn: typeof fetch = (input, init) => fetch(input, init),
  ) {
    this.$rpc = new AuthClient(transport);
  }

  private get cookieMode(): boolean {
    return this.config.loginResponseType === 'cookie';
  }

  getProviders(email = ''): Promise<AuthProvidersResponse> {
    return unary(
      'AuthService: getProviders',
      AuthProvidersRequest.create({ Email: email.trim() }),
      (i, o) => this.$rpc.getProviders(i, o),
    );
  }

  async authorizeUrl(opts: AuthorizeOptions): Promise<string> {
    const params = new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: opts.redirectUri,
      response_type: this.cookieMode ? 'cookie' : 'code',
      response_mode: 'query',
      scope: 'openid email profile',
      device_id: this.deviceId,
      remember_me: String(opts.rememberMe),
      nonce: randomString(32),
    });
    if (opts.provider) {
      params.set('provider', opts.provider);
    }
    const email = opts.email?.trim().toLowerCase();
    const hint = email || opts.loginHint?.trim().toLowerCase();
    if (email) {
      params.set('idpuser.email', email);
    }
    if (hint) {
      params.set('login_hint', hint);
    }
    if (!this.cookieMode) {
      params.set('code_challenge', await this.user.getCodeChallenge());
      params.set('code_challenge_method', 'S256');
    }
    // the login starts on the API host of the console: the callback that
    // sets the cookies of a cookie session runs on the host of this request
    return `${this.config.apiUrl}${PATH_AUTHORIZE}?${params.toString()}`;
  }

  exchangeCode(code: string): Promise<PbToken> {
    const verifier = this.user.useCodeVerifier();
    if (!verifier) {
      return Promise.reject(new Error('The sign-in was started in another tab or has expired'));
    }
    return unary(
      'AuthService: exchangeCode',
      ExchangeCodeRequest.create({ Code: code, Verifier: verifier }),
      (i, o) => this.$rpc.exchangeCode(i, o),
    );
  }

  async getUserToken(accessToken?: string): Promise<UserTokenResponse> {
    const cookie = !accessToken && this.cookieMode;
    const meta: RpcMetadata | undefined = accessToken
      ? { authorization: 'Bearer ' + accessToken }
      : cookie
        ? { 'x-csrf-token': this.user.csrfToken }
        : undefined;
    const res = await unary('AuthService: getUserToken', Empty.create(), (i, o) =>
      this.$rpc.getUserToken(i, { ...o, meta }),
    );
    return this.applyToken(res, cookie, accessToken || this.user.token.AccessToken);
  }

  async selectOrg(orgId: string, rememberMe = false): Promise<UserTokenResponse> {
    const req = SelectOrgRequest.create({ OrgID: orgId, RememberMe: rememberMe });
    if (this.user.isCookieSession) {
      // gRPC cannot replace the HttpOnly cookie: the REST route does. It
      // bypasses the auth interceptor, so it expires a refused session itself
      const token = this.user.token;
      const json = await restCall<JsonValue>(this.fetchFn, this.config.apiUrl, {
        method: 'POST',
        path: PATH_AUTH_ORG,
        csrfToken: this.user.csrfToken,
        deviceId: this.deviceId,
        body: SelectOrgRequest.toJson(req),
      }).catch((err: unknown) => {
        expireRefusedSession(this.user, token, err);
        throw err;
      });
      return this.applyToken(
        UserTokenResponse.fromJson(json ?? {}, { ignoreUnknownFields: true }),
        true,
      );
    }
    const res = await unary('AuthService: selectOrg', req, (i, o) => this.$rpc.selectOrg(i, o));
    return this.applyToken(res, false);
  }

  getCallerScope(): Promise<CallerScope> {
    return unary('AuthService: getCallerScope', Empty.create(), (i, o) =>
      this.$rpc.getCallerScope(i, o),
    );
  }

  getAllowedMethods(): Promise<ServiceAccessInfo> {
    return unary('AuthService: getAllowedMethods', Empty.create(), (i, o) =>
      this.$rpc.getAllowedMethods(i, o),
    );
  }

  async revokeToken(): Promise<void> {
    if (this.user.isCookieSession) {
      await restCall(this.fetchFn, this.config.apiUrl, {
        method: 'DELETE',
        path: PATH_REVOKE_TOKEN,
        csrfToken: this.user.csrfToken,
        deviceId: this.deviceId,
      });
      return;
    }
    await unary('AuthService: revokeToken', Empty.create(), (i, o) => this.$rpc.revokeToken(i, o));
  }

  private applyToken(res: UserTokenResponse, cookie: boolean, accessToken = ''): UserTokenResponse {
    const t = res.Token;
    const u = res.UserInfo;
    const token = new Token(
      cookie ? '' : t?.AccessToken || accessToken,
      cookie ? COOKIE_TOKEN_TYPE : t?.TokenType || 'Bearer',
      t?.ExpiresAt || undefined,
      t?.IssuedAt || undefined,
      t?.Issuer,
      t?.Audience,
      t?.Provider ? getIDPDisplayName(t.Provider) : undefined,
    );
    const profile = new UserInfo(
      u?.ID || '',
      u?.Name || u?.Email || 'Unknown',
      u?.Email || '',
      u?.EmailVerified ?? false,
      u?.Orgs ?? {},
      u?.OrgID || '',
      u?.OrgRole || '',
      u?.OrgRoleSource || '',
    );
    this.user.setToken(token, profile);
    return res;
  }
}
