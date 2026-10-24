import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { Empty } from 'src/services/trustyca/protogen/google/protobuf/empty';
import { ServerStatusResponse, ServerVersion } from 'src/services/trustyca/protogen/status';
import { StatusClient } from 'src/services/trustyca/protogen/status.client';
import { unary } from './call';

/** The build and status of the server, open to guests on the wfe */
export interface IStatusService {
  version(): Promise<ServerVersion>;
  server(): Promise<ServerStatusResponse>;
}

export class StatusService implements IStatusService {
  private readonly $rpc: StatusClient;

  constructor(transport: RpcTransport) {
    this.$rpc = new StatusClient(transport);
  }

  version(): Promise<ServerVersion> {
    return unary('StatusService: version', Empty.create(), (i, o) => this.$rpc.version(i, o));
  }

  server(): Promise<ServerStatusResponse> {
    return unary('StatusService: server', Empty.create(), (i, o) => this.$rpc.server(i, o));
  }
}
