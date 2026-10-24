import { RpcError } from '@protobuf-ts/runtime-rpc';
import { CaUnavailableError } from 'src/services/trustyca/rpc/errors';
import { toUiError } from './errors';

describe('toUiError', () => {
  it('maps the gRPC codes to the UI kinds', () => {
    const kind = (code: string) => toUiError(new RpcError('m', code)).kind;
    expect(kind('UNAUTHENTICATED')).toBe('unauthenticated');
    expect(kind('PERMISSION_DENIED')).toBe('forbidden');
    expect(kind('NOT_FOUND')).toBe('not-found');
    expect(kind('INVALID_ARGUMENT')).toBe('invalid');
    expect(kind('FAILED_PRECONDITION')).toBe('conflict');
    expect(kind('ABORTED')).toBe('conflict');
    expect(kind('ALREADY_EXISTS')).toBe('conflict');
    expect(kind('UNAVAILABLE')).toBe('unavailable');
    expect(kind('DEADLINE_EXCEEDED')).toBe('unavailable');
    expect(kind('INTERNAL')).toBe('error');
  });

  it('keeps the server text and the correlation ID', () => {
    const e = toUiError(
      new RpcError('label in use', 'FAILED_PRECONDITION', { 'x-correlation-id': ['c-1'] }),
    );
    expect(e).toEqual({
      kind: 'conflict',
      title: 'Conflict',
      detail: 'label in use',
      retry: false,
      code: 'FAILED_PRECONDITION',
      correlationId: 'c-1',
    });
  });

  it('tells an unreachable CA from an unreachable server', () => {
    const e = toUiError(new CaUnavailableError(new RpcError('CA is not available', 'UNAVAILABLE')));
    expect(e.kind).toBe('ca-unavailable');
    expect(e.title).toBe('CA service unavailable');
    expect(e.retry).toBe(true);
  });

  it('describes anything else', () => {
    expect(toUiError(new Error('boom'))).toMatchObject({ kind: 'error', detail: 'boom' });
    expect(toUiError('text')).toMatchObject({ kind: 'error', detail: 'text' });
  });
});
