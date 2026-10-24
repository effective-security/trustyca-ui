import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { log } from 'src/libts/logging';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { provideTrustyApi } from './core/api/providers';

if (!environment.production) {
  log.to(console);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideTrustyApi(environment),
  ],
};
