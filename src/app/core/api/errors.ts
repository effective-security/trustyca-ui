import { RpcError } from '@protobuf-ts/runtime-rpc';
import { isCaUnavailable } from 'src/services/trustyca/rpc/errors';

export type UiErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'invalid'
  | 'conflict'
  | 'ca-unavailable'
  | 'unavailable'
  | 'error';

/** A failure as the console shows it (DESIGN.md section 10.4) */
export interface UiError {
  readonly kind: UiErrorKind;
  readonly title: string;
  /** The server text, or a description of the failure */
  readonly detail: string;
  /** True when trying again may succeed */
  readonly retry: boolean;
  /** The gRPC code, when the failure is an rpc */
  readonly code?: string;
  /** The correlation ID of the server log */
  readonly correlationId?: string;
}

function metaValue(err: RpcError, key: string): string | undefined {
  const v = err.meta?.[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Maps an rpc failure, a REST failure or any thrown value to a UiError */
export function toUiError(err: unknown): UiError {
  if (!(err instanceof RpcError)) {
    const detail = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    return { kind: 'error', title: 'Something went wrong', detail, retry: false };
  }

  const base = {
    detail: err.message,
    code: err.code,
    correlationId: metaValue(err, 'x-correlation-id'),
  };
  if (isCaUnavailable(err)) {
    return {
      ...base,
      kind: 'ca-unavailable',
      title: 'CA service unavailable',
      retry: true,
    };
  }
  switch (err.code) {
    case 'UNAUTHENTICATED':
      return { ...base, kind: 'unauthenticated', title: 'Your session has expired', retry: false };
    case 'PERMISSION_DENIED':
      return { ...base, kind: 'forbidden', title: 'Not allowed', retry: false };
    case 'NOT_FOUND':
      return { ...base, kind: 'not-found', title: 'Not found', retry: false };
    case 'INVALID_ARGUMENT':
    case 'OUT_OF_RANGE':
      return { ...base, kind: 'invalid', title: 'Check the request', retry: false };
    case 'FAILED_PRECONDITION':
    case 'ABORTED':
    case 'ALREADY_EXISTS':
      return { ...base, kind: 'conflict', title: 'Conflict', retry: false };
    case 'UNAVAILABLE':
    case 'DEADLINE_EXCEEDED':
    case 'RESOURCE_EXHAUSTED':
      return { ...base, kind: 'unavailable', title: 'The server did not answer', retry: true };
    default:
      return { ...base, kind: 'error', title: 'Something went wrong', retry: false };
  }
}
