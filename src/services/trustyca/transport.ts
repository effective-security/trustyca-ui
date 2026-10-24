import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import type { RpcError, RpcInterceptor, RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RuntimeConfig } from 'src/services/runtimeConfig';
import { IAppUser } from 'src/types';

/** The deadline of an rpc unless the call sets one */
export const DEFAULT_RPC_TIMEOUT = 15_000;

/**
 * Signs the user out with the session-expired flag when the server refused
 * the session of a call as UNAUTHENTICATED, unless the session changed
 * since the call: a late answer for a token that a sign-out or a new
 * sign-in replaced does not end the new session. PERMISSION_DENIED is not
 * an expiry.
 */
export function expireRefusedSession(user: IAppUser, token: IAppUser['token'], err: unknown): void {
  if (
    (err as RpcError | undefined)?.code === 'UNAUTHENTICATED' &&
    user.token === token &&
    user.isAuthenticated
  ) {
    user.logout(true);
  }
}

/**
 * Adds the session of the user to every call that does not carry an
 * authorization of its own: the bearer token, or the CSRF header of a
 * cookie session. A call that fails with UNAUTHENTICATED on the session
 * signs the user out with the session-expired flag (expireRefusedSession).
 */
export function authInterceptor(user: IAppUser): RpcInterceptor {
  return {
    interceptUnary(next, method, input, options) {
      const ownAuth = !!options.meta?.['authorization'];
      const meta = ownAuth ? options.meta : user.rpcMetadata(options.meta);
      // the session the call carries
      const token = user.token;
      const call = next(method, input, { ...options, meta });
      if (!ownAuth && user.isAuthenticated && method.name !== 'RevokeToken') {
        call.response.catch((err: unknown) => expireRefusedSession(user, token, err));
      }
      return call;
    },
  };
}

/** Adds the device ID the server records with the session events */
export function deviceInterceptor(deviceId: string): RpcInterceptor {
  return {
    interceptUnary(next, method, input, options) {
      return next(method, input, {
        ...options,
        meta: { ...options.meta, 'x-device-id': deviceId },
      });
    },
  };
}

/**
 * The gRPC-Web transport of every service: binary format, straight to
 * the wfe listener, which upgrades gRPC-Web in process. A cookie session
 * sends the cookies (`credentials: 'include'`); a bearer session sends
 * none.
 */
export function createRpcTransport(
  config: RuntimeConfig,
  user: IAppUser,
  deviceId: string,
): RpcTransport {
  return new GrpcWebFetchTransport({
    baseUrl: config.apiUrl,
    format: 'binary',
    fetchInit: { credentials: config.loginResponseType === 'cookie' ? 'include' : 'same-origin' },
    timeout: DEFAULT_RPC_TIMEOUT,
    interceptors: [deviceInterceptor(deviceId), authInterceptor(user)],
  });
}
