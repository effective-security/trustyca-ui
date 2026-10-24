import { DOCUMENT } from '@angular/common';
import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { AppPlatformService, PlatformInfo } from 'src/services/AppPlatform';
import { AppUser } from 'src/services/AppUser';
import { resolveRuntimeConfig, RuntimeConfig } from 'src/services/runtimeConfig';
import { StorageService } from 'src/services/storage';
import { AuthService } from 'src/services/trustyca/rpc/AuthService';
import { OrgsService } from 'src/services/trustyca/rpc/OrgsService';
import { StatusService } from 'src/services/trustyca/rpc/StatusService';
import { createRpcTransport } from 'src/services/trustyca/transport';
import {
  APP_PLATFORM,
  APP_USER,
  AUTH_SERVICE,
  ORGS_SERVICE,
  RPC_TRANSPORT,
  RUNTIME_CONFIG,
  STATUS_SERVICE,
  STORAGE,
} from './tokens';

const PLATFORM_INFO = new InjectionToken<PlatformInfo>('trustyca.PLATFORM_INFO');

function browserWindow(): Window {
  const win = inject(DOCUMENT).defaultView;
  if (!win) {
    throw new Error('Trusty CA console needs a browser window');
  }
  return win;
}

/**
 * The storage prefix: the API host, so two environments in one browser do
 * not share sessions
 */
export function storagePrefix(apiUrl: string): string {
  try {
    return new URL(apiUrl).host + '_';
  } catch {
    return 'trustyca_';
  }
}

/**
 * Builds, once per application, the framework-free layer behind the DI
 * tokens: runtime configuration, platform, storage, user, the gRPC-Web
 * transport and the services of the session (DESIGN.md section 3.1). The
 * CA and CIS services come with provideCaApi() on the lazy CA routes, so
 * their messages stay out of the initial bundle.
 *
 * @param fallback the build-time configuration, used where config.js is empty
 */
export function provideTrustyApi(fallback: Partial<RuntimeConfig> = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: RUNTIME_CONFIG, useFactory: () => resolveRuntimeConfig(browserWindow(), fallback) },
    {
      provide: PLATFORM_INFO,
      useFactory: () => new PlatformInfo(inject(RUNTIME_CONFIG).appVersion, browserWindow()),
    },
    {
      provide: STORAGE,
      useFactory: () =>
        new StorageService(inject(PLATFORM_INFO), storagePrefix(inject(RUNTIME_CONFIG).apiUrl)),
    },
    {
      provide: APP_PLATFORM,
      useFactory: () => new AppPlatformService(inject(STORAGE), inject(PLATFORM_INFO)),
    },
    { provide: APP_USER, useFactory: () => new AppUser(inject(STORAGE), inject(DOCUMENT)) },
    {
      provide: RPC_TRANSPORT,
      useFactory: () =>
        createRpcTransport(inject(RUNTIME_CONFIG), inject(APP_USER), inject(APP_PLATFORM).deviceID),
    },
    {
      provide: AUTH_SERVICE,
      useFactory: () =>
        new AuthService(
          inject(RPC_TRANSPORT),
          inject(APP_USER),
          inject(RUNTIME_CONFIG),
          inject(APP_PLATFORM).deviceID,
        ),
    },
    { provide: ORGS_SERVICE, useFactory: () => new OrgsService(inject(RPC_TRANSPORT)) },
    { provide: STATUS_SERVICE, useFactory: () => new StatusService(inject(RPC_TRANSPORT)) },
  ]);
}
