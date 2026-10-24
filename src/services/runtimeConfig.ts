/**
 * The session mode of the console (DESIGN.md section 4.2): `code` keeps a
 * bearer token, `cookie` relies on the HttpOnly cookie of the server and
 * sends the CSRF cookie in `x-csrf-token`.
 */
export type LoginResponseType = 'code' | 'cookie';

export interface RuntimeConfig {
  /** The wfe listener, without a trailing slash */
  readonly apiUrl: string;
  readonly loginResponseType: LoginResponseType;
  readonly appVersion: string;
}

/** The object `config.js` assigns, written at container start */
export interface TrustycaRuntimeConfigGlobal {
  API_URL?: string;
  LOGIN_RESPONSE_TYPE?: string;
}

declare global {
  interface Window {
    __TRUSTYCA_RUNTIME_CONFIG__?: TrustycaRuntimeConfigGlobal;
  }
}

export const DEFAULT_API_URL = 'https://localhost:8880';

function parseLoginResponseType(value: string | undefined): LoginResponseType | undefined {
  const v = value?.trim().toLowerCase();
  return v === 'code' || v === 'cookie' ? v : undefined;
}

function trimUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

/**
 * Resolves the runtime configuration: `window.__TRUSTYCA_RUNTIME_CONFIG__`
 * from `/config.js` first, then the build-time fallback (the Angular
 * environment), then the dev defaults.
 */
export function resolveRuntimeConfig(
  win: Pick<Window, '__TRUSTYCA_RUNTIME_CONFIG__'> | undefined,
  fallback: Partial<RuntimeConfig> = {},
): RuntimeConfig {
  const runtime = win?.__TRUSTYCA_RUNTIME_CONFIG__ ?? {};
  return {
    apiUrl: trimUrl(runtime.API_URL) || trimUrl(fallback.apiUrl) || DEFAULT_API_URL,
    loginResponseType:
      parseLoginResponseType(runtime.LOGIN_RESPONSE_TYPE) ??
      parseLoginResponseType(fallback.loginResponseType) ??
      'code',
    appVersion: fallback.appVersion ?? '',
  };
}
