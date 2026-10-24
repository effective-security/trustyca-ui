import type { PartialMessage } from '@protobuf-ts/runtime';
import {
  ClientStreamingCall,
  DuplexStreamingCall,
  mergeRpcOptions,
  MethodInfo,
  RpcError,
  RpcMetadata,
  RpcOptions,
  RpcStatus,
  RpcTransport,
  ServerStreamingCall,
  UnaryCall,
} from '@protobuf-ts/runtime-rpc';

export interface RecordedCall {
  /** The proto service, `pb.Auth` */
  service: string;
  /** The method name, `GetUserToken` */
  method: string;
  input: object;
  options: RpcOptions;
}

type FakeResponse = object | RpcError | ((input: object) => object | RpcError);

/** Marks a promise as handled, as an awaited UnaryCall does for all its parts */
function handled<T>(p: Promise<T>): Promise<T> {
  p.catch(() => undefined);
  return p;
}

/**
 * An RpcTransport for the service specs: the generated clients run against
 * it unchanged (the interceptors of the default options included), so a
 * proto regeneration that renames a method fails a spec. Every call is
 * recorded; a method answers the response set with respond(), or the
 * default message of its output type.
 */
export class FakeTransport implements RpcTransport {
  readonly calls: RecordedCall[] = [];
  private readonly responses = new Map<string, FakeResponse>();

  constructor(private readonly defaults: RpcOptions = {}) {}

  /** Sets the answer of a method, by its name (`GetUserToken`) */
  respond(method: string, response: FakeResponse): this {
    this.responses.set(method, response);
    return this;
  }

  /** The last call of a method */
  last(method: string): RecordedCall | undefined {
    return this.calls.filter((c) => c.method === method).pop();
  }

  mergeOptions(options?: Partial<RpcOptions>): RpcOptions {
    return mergeRpcOptions(this.defaults, options);
  }

  unary<I extends object, O extends object>(
    method: MethodInfo<I, O>,
    input: I,
    options: RpcOptions,
  ): UnaryCall<I, O> {
    this.calls.push({ service: method.service.typeName, method: method.name, input, options });

    let answer = this.responses.get(method.name);
    if (typeof answer === 'function') {
      answer = answer(input);
    }
    let response: Promise<O>;
    if (answer instanceof RpcError) {
      answer.serviceName = method.service.typeName;
      answer.methodName = method.name;
      response = Promise.reject(answer);
    } else {
      response = Promise.resolve(
        answer ? method.O.create(answer as PartialMessage<O>) : method.O.create(),
      );
    }

    const headers = handled(response.then((): RpcMetadata => ({})));
    const status = handled(response.then((): RpcStatus => ({ code: 'OK', detail: '' })));
    const trailers = handled(response.then((): RpcMetadata => ({})));
    return new UnaryCall(method, options.meta ?? {}, input, headers, response, status, trailers);
  }

  serverStreaming<I extends object, O extends object>(): ServerStreamingCall<I, O> {
    throw new Error('FakeTransport: server streaming is not supported');
  }

  clientStreaming<I extends object, O extends object>(): ClientStreamingCall<I, O> {
    throw new Error('FakeTransport: client streaming is not supported');
  }

  duplex<I extends object, O extends object>(): DuplexStreamingCall<I, O> {
    throw new Error('FakeTransport: duplex streaming is not supported');
  }
}
