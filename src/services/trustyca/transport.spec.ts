import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { Token, UserInfo } from 'src/models/Auth';
import { AppUser } from 'src/services/AppUser';
import { StorageService } from 'src/services/storage';
import { AuthClient } from './protogen/auth.client';
import { Empty } from './protogen/google/protobuf/empty';
import { redact, REDACTED } from './rpc/call';
import { FakeTransport } from './rpc/testing/fake-transport';
import {
  authInterceptor,
  createRpcTransport,
  DEFAULT_RPC_TIMEOUT,
  deviceInterceptor,
} from './transport';

describe('transport', () => {
  let user: AppUser;
  let transport: FakeTransport;
  let client: AuthClient;

  beforeEach(() => {
    user = new AppUser(new StorageService());
    transport = new FakeTransport({
      interceptors: [deviceInterceptor('device-1'), authInterceptor(user)],
    });
    client = new AuthClient(transport);
  });

  const signIn = () =>
    user.setToken(
      new Token('jwt', 'Bearer', new Date(Date.now() + 3600_000)),
      new UserInfo('42', 'u', 'u@x', true, {}, 'org1', 'Admin'),
    );

  it('adds the device ID to every call and the session once signed in', async () => {
    await client.getProviders({ Email: '' });
    expect(transport.last('GetProviders')?.options.meta).toEqual({ 'x-device-id': 'device-1' });

    signIn();
    await client.getCallerScope(Empty.create());
    expect(transport.last('GetCallerScope')?.options.meta).toEqual({
      'x-device-id': 'device-1',
      authorization: 'Bearer jwt',
    });
  });

  it('keeps the authorization a call sets itself', async () => {
    signIn();
    await client.getUserToken(Empty.create(), { meta: { authorization: 'Bearer other' } });
    expect(transport.last('GetUserToken')?.options.meta?.['authorization']).toBe('Bearer other');
  });

  it('signs out with the expired flag when the session is refused', async () => {
    signIn();
    transport.respond('GetCallerScope', new RpcError('token revoked', 'UNAUTHENTICATED'));
    await expect(client.getCallerScope(Empty.create())).rejects.toThrow('token revoked');
    expect(user.isAuthenticated).toBe(false);
    expect(user.sessionExpired).toBe(true);
  });

  it('does not end a newer session on the late refusal of an older one', async () => {
    signIn();
    transport.respond('GetCallerScope', new RpcError('token revoked', 'UNAUTHENTICATED'));
    const call = client.getCallerScope(Empty.create());
    // a new sign-in lands before the answer of the old session
    user.setToken(
      new Token('jwt-new', 'Bearer', new Date(Date.now() + 3600_000)),
      new UserInfo('42', 'u', 'u@x', true, {}, 'org1', 'Admin'),
    );
    await expect(call).rejects.toThrow('token revoked');
    expect(user.isAuthenticated).toBe(true);
    expect(user.token.AccessToken).toBe('jwt-new');
  });

  it('does not sign out on a refused revoke or on other failures', async () => {
    signIn();
    transport.respond('RevokeToken', new RpcError('no token to revoke', 'UNAUTHENTICATED'));
    await expect(client.revokeToken(Empty.create())).rejects.toThrow();
    transport.respond('GetCallerScope', new RpcError('denied', 'PERMISSION_DENIED'));
    await expect(client.getCallerScope(Empty.create())).rejects.toThrow();
    expect(user.isAuthenticated).toBe(true);
  });

  it('creates the gRPC-Web transport of the session mode', () => {
    const bearer = createRpcTransport(
      { apiUrl: 'https://localhost:8880', loginResponseType: 'code', appVersion: '' },
      user,
      'd',
    );
    expect(bearer).toBeInstanceOf(GrpcWebFetchTransport);
    const opts = bearer.mergeOptions();
    expect(opts.timeout).toBe(DEFAULT_RPC_TIMEOUT);
    expect(opts.interceptors).toHaveLength(2);
    expect((opts as { fetchInit?: RequestInit }).fetchInit?.credentials).toBe('same-origin');

    const cookie = createRpcTransport(
      { apiUrl: 'https://api.local.trustyca.io:8880', loginResponseType: 'cookie', appVersion: '' },
      user,
      'd',
    );
    expect((cookie.mergeOptions() as { fetchInit?: RequestInit }).fetchInit?.credentials).toBe(
      'include',
    );
  });

  it('redacts keys, secrets, CSRs and codes from logged requests', () => {
    expect(
      redact({
        Label: 'x',
        KeyPem: '-----BEGIN',
        Nested: [{ Secret: 's', Request: 'csr' }],
        Code: '',
        Verifier: 'v',
      }),
    ).toEqual({
      Label: 'x',
      KeyPem: REDACTED,
      Nested: [{ Secret: REDACTED, Request: REDACTED }],
      Code: '',
      Verifier: REDACTED,
    });
  });
});
