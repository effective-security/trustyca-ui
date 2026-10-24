import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { CaService } from 'src/services/trustyca/rpc/CaService';
import { CisService } from 'src/services/trustyca/rpc/CisService';
import { APP_USER, CA_SERVICE, CIS_SERVICE, RPC_TRANSPORT } from './tokens';

/**
 * The CA and CIS services, for the providers of the lazy CA routes: the CA
 * messages load with the first CA page, not with the login
 */
export function provideCaApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: CA_SERVICE,
      useFactory: () => new CaService(inject(RPC_TRANSPORT), inject(APP_USER)),
    },
    { provide: CIS_SERVICE, useFactory: () => new CisService(inject(RPC_TRANSPORT)) },
  ]);
}
