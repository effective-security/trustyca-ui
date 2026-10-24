import { Routes } from '@angular/router';
import { authGuard, loginGuard, orgGuard } from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Trusty CA',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'auth',
    children: [
      {
        path: 'authenticated',
        title: 'Signing in · Trusty CA',
        loadComponent: () => import('./features/auth/authenticated').then((m) => m.Authenticated),
      },
      {
        path: 'select-org',
        title: 'Choose an organization · Trusty CA',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/select-org').then((m) => m.SelectOrg),
      },
      {
        path: 'noorg',
        title: 'No organization · Trusty CA',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/no-org').then((m) => m.NoOrg),
      },
      {
        path: 'norole',
        title: 'No access · Trusty CA',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/no-role').then((m) => m.NoRole),
      },
      { path: '', pathMatch: 'full', redirectTo: '/login' },
    ],
  },
  {
    path: '',
    canActivateChild: [authGuard, orgGuard],
    loadComponent: () => import('./layout/console-layout').then((m) => m.ConsoleLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Trusty CA',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
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
      // last: the CA pages load with their services when no route above matches
      { path: '', loadChildren: () => import('./features/ca/ca.routes').then((m) => m.CA_ROUTES) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
