import { InjectionToken } from '@angular/core';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import type { RuntimeConfig } from 'src/services/runtimeConfig';
import type { StorageService } from 'src/services/storage';
import type { IAuthService } from 'src/services/trustyca/rpc/AuthService';
import type { ICaService } from 'src/services/trustyca/rpc/CaService';
import type { ICisService } from 'src/services/trustyca/rpc/CisService';
import type { IOrgsService } from 'src/services/trustyca/rpc/OrgsService';
import type { IStatusService } from 'src/services/trustyca/rpc/StatusService';
import type { IAppPlatform, IAppUser } from 'src/types';

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('trustyca.RUNTIME_CONFIG');
export const APP_PLATFORM = new InjectionToken<IAppPlatform>('trustyca.APP_PLATFORM');
export const STORAGE = new InjectionToken<StorageService>('trustyca.STORAGE');
export const APP_USER = new InjectionToken<IAppUser>('trustyca.APP_USER');
export const RPC_TRANSPORT = new InjectionToken<RpcTransport>('trustyca.RPC_TRANSPORT');

export const AUTH_SERVICE = new InjectionToken<IAuthService>('trustyca.AUTH_SERVICE');
export const ORGS_SERVICE = new InjectionToken<IOrgsService>('trustyca.ORGS_SERVICE');
/** Provided by provideCaApi() on the lazy routes of the CA pages */
export const CA_SERVICE = new InjectionToken<ICaService>('trustyca.CA_SERVICE');
/** Provided by provideCaApi() on the lazy routes of the CA pages */
export const CIS_SERVICE = new InjectionToken<ICisService>('trustyca.CIS_SERVICE');
export const STATUS_SERVICE = new InjectionToken<IStatusService>('trustyca.STATUS_SERVICE');
