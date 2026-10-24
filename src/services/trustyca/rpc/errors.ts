import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * The CA service is out of reach: the wfe could not forward the call to a
 * backend ("CA is not available", "CA is not configured"). The CA pages
 * show the unavailable state with Retry; the next call tries again.
 *
 * Kept apart from CaService, so the error mapping of the console does not
 * load the CA messages.
 */
export class CaUnavailableError extends RpcError {
  constructor(cause: RpcError) {
    super(cause.message, cause.code, cause.meta);
    this.name = 'CaUnavailableError';
    this.serviceName = cause.serviceName || 'pb.CA';
    this.methodName = cause.methodName;
  }
}

export function isCaUnavailable(err: unknown): boolean {
  return err instanceof CaUnavailableError;
}
