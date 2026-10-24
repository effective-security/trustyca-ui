import { RuntimeConfig } from 'src/services/runtimeConfig';

/** `npm start`: the console on http://localhost:4200 with a bearer session */
export const environment: { production: boolean } & Partial<RuntimeConfig> = {
  production: false,
  apiUrl: 'https://localhost:8880',
  loginResponseType: 'code',
  appVersion: '0.1.0-dev',
};
