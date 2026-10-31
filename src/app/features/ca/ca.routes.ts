import { Routes } from '@angular/router';
import { provideCaApi } from '../../core/api/ca-providers';

/**
 * The CA pages of the console shell. Their services, and with them the CA
 * messages, load with the first CA page.
 */
export const CA_ROUTES: Routes = [
  {
    path: '',
    providers: [provideCaApi()],
    children: [
      {
        path: 'issuers',
        title: 'Issuers · Trusty CA',
        loadComponent: () => import('../issuers/issuers').then((m) => m.Issuers),
      },
      {
        path: 'certificates',
        title: 'Certificates · Trusty CA',
        loadComponent: () => import('../certificates/certificates').then((m) => m.Certificates),
      },
      {
        path: 'profiles',
        title: 'Profiles · Trusty CA',
        loadComponent: () => import('../profiles/profiles').then((m) => m.Profiles),
      },
      {
        path: 'roots',
        title: 'Trust anchors · Trusty CA',
        loadComponent: () => import('../roots/roots').then((m) => m.Roots),
      },
      {
        path: 'revocation',
        title: 'Revocation · Trusty CA',
        loadComponent: () => import('../revocation/revocation').then((m) => m.Revocation),
      },
      {
        path: 'lookup',
        title: 'Lookup · Trusty CA',
        loadComponent: () => import('../lookup/lookup').then((m) => m.Lookup),
      },
    ],
  },
];
