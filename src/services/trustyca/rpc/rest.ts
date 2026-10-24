import { RpcError } from '@protobuf-ts/runtime-rpc';
import { log } from 'src/libts/logging';

/** The gRPC code of an HTTP status, so a REST failure maps like an rpc one */
export function grpcCodeOfHttpStatus(status: number): string {
  switch (status) {
    case 400:
      return 'INVALID_ARGUMENT';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'PERMISSION_DENIED';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'FAILED_PRECONDITION';
    case 429:
      return 'RESOURCE_EXHAUSTED';
    case 501:
      return 'UNIMPLEMENTED';
    case 503:
      return 'UNAVAILABLE';
    case 504:
      return 'DEADLINE_EXCEEDED';
    default:
      return status >= 500 ? 'INTERNAL' : 'UNKNOWN';
  }
}

export interface RestRequest {
  method: 'POST' | 'DELETE';
  path: string;
  csrfToken: string;
  deviceId?: string;
  body?: unknown;
}

/**
 * Calls a REST route of the wfe with the session cookie: the two calls of
 * a cookie session that gRPC cannot make, because they replace or remove
 * the HttpOnly cookie (POST /v1/auth/org, DELETE /pb.Auth/RevokeToken).
 * Returns the parsed JSON body, or undefined for 204. A failure is thrown
 * as an RpcError with the gRPC code of the HTTP status and the server text.
 */
export async function restCall<T>(
  fetchFn: typeof fetch,
  baseUrl: string,
  req: RestRequest,
): Promise<T | undefined> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-CSRF-Token': req.csrfToken,
  };
  if (req.deviceId) {
    headers['X-Device-ID'] = req.deviceId;
  }
  let body: string | undefined;
  if (req.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(req.body);
  }

  let res: Response;
  try {
    res = await fetchFn(baseUrl + req.path, {
      method: req.method,
      credentials: 'include',
      headers,
      body,
    });
  } catch (err) {
    log.error(`REST ${req.method} ${req.path}`, err);
    throw new RpcError(err instanceof Error ? err.message : String(err), 'UNAVAILABLE');
  }

  const text = res.status === 204 ? '' : await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    const message =
      (json as { message?: string } | undefined)?.message || res.statusText || `HTTP ${res.status}`;
    const correlation = res.headers.get('X-Correlation-ID');
    throw new RpcError(
      message,
      grpcCodeOfHttpStatus(res.status),
      correlation ? { 'x-correlation-id': correlation } : {},
    );
  }
  return json as T | undefined;
}
