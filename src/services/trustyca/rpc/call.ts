import type { RpcOptions, UnaryCall } from '@protobuf-ts/runtime-rpc';
import { log } from 'src/libts/logging';

/**
 * Fields that never reach a log: imported keys, API key secrets, CSRs,
 * tokens and the one-time code and its verifier
 */
const REDACTED_FIELDS = new Set(['KeyPem', 'Secret', 'Request', 'AccessToken', 'Code', 'Verifier']);

export const REDACTED = '[redacted]';

/** Returns a copy of a request with the sensitive fields replaced, for logging */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = REDACTED_FIELDS.has(key) && v !== '' && v != null ? REDACTED : redact(v);
  }
  return out;
}

/**
 * Runs a unary call of a generated client: logs the redacted request,
 * returns the response and logs and rethrows a failure
 */
export async function unary<I extends object, O extends object>(
  scope: string,
  input: I,
  call: (input: I, options?: RpcOptions) => UnaryCall<I, O>,
  options?: RpcOptions,
): Promise<O> {
  log.debug(scope, redact(input));
  try {
    const { response } = await call(input, options);
    return response;
  } catch (err) {
    log.error(scope, err);
    throw err;
  }
}
