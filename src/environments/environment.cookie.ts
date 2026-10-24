import { RuntimeConfig } from 'src/services/runtimeConfig';

/**
 * `npm run start:cookie`: the console on https://app.local.trustyca.io:4200
 * with the HttpOnly cookie session of the server, whose cookies live on
 * `.local.trustyca.io`: the API is reached on api.local.trustyca.io, a host
 * under the cookie domain (README.md, "Cookie session")
 */
export const environment: { production: boolean } & Partial<RuntimeConfig> = {
  production: false,
  apiUrl: 'https://api.local.trustyca.io:8880',
  loginResponseType: 'cookie',
  appVersion: '0.1.0-dev',
};
