import { Routes } from '@angular/router';
import { previewGuard } from './core/auth/preview.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Login · Trusty CA',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivateChild: [previewGuard],
    loadComponent: () => import('./layout/console-layout').then((m) => m.ConsoleLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Trusty CA',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'issuers',
        title: 'Issuers · Trusty CA',
        loadComponent: () => import('./features/issuers/issuers').then((m) => m.Issuers),
      },
      {
        path: 'certificates',
        title: 'Certificates · Trusty CA',
        loadComponent: () =>
          import('./features/certificates/certificates').then((m) => m.Certificates),
      },
      {
        path: 'account',
        title: 'Account · Trusty CA',
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
      {
        path: 'settings',
        title: 'Settings · Trusty CA',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
