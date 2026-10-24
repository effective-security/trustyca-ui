import { RuntimeConfig } from 'src/services/runtimeConfig';

/**
 * The production build: the API URL and the session mode come from
 * `config.js`, which the container writes at start (DESIGN.md section 12.3)
 */
export const environment: { production: boolean } & Partial<RuntimeConfig> = {
  production: true,
  appVersion: '0.1.0',
};
