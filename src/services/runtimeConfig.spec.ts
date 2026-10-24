import { DEFAULT_API_URL, resolveRuntimeConfig } from './runtimeConfig';

describe('resolveRuntimeConfig', () => {
  it('defaults to the dev server in bearer mode', () => {
    expect(resolveRuntimeConfig(undefined)).toEqual({
      apiUrl: DEFAULT_API_URL,
      loginResponseType: 'code',
      appVersion: '',
    });
  });

  it('prefers config.js over the build fallback', () => {
    const cfg = resolveRuntimeConfig(
      {
        __TRUSTYCA_RUNTIME_CONFIG__: {
          API_URL: ' https://api.example.com/ ',
          LOGIN_RESPONSE_TYPE: 'COOKIE',
        },
      },
      { apiUrl: 'https://fallback', loginResponseType: 'code', appVersion: '1.2.3' },
    );
    expect(cfg).toEqual({
      apiUrl: 'https://api.example.com',
      loginResponseType: 'cookie',
      appVersion: '1.2.3',
    });
  });

  it('uses the fallback when config.js is empty and ignores unknown modes', () => {
    const cfg = resolveRuntimeConfig(
      { __TRUSTYCA_RUNTIME_CONFIG__: { API_URL: '', LOGIN_RESPONSE_TYPE: 'token' } },
      { apiUrl: 'https://api.local.trustyca.io:8880', loginResponseType: 'cookie' },
    );
    expect(cfg.apiUrl).toBe('https://api.local.trustyca.io:8880');
    expect(cfg.loginResponseType).toBe('cookie');
  });
});
