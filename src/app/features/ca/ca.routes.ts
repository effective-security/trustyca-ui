import { Routes } from '@angular/router';
import { provideCaApi } from '../../core/api/ca-providers';
import { IssuerPage } from '../issuers/issuer-page';

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
        path: 'issuers/register',
        title: 'Register issuer · Trusty CA',
        loadComponent: () => import('../issuers/register-issuer').then((m) => m.RegisterIssuer),
      },
      {
        path: 'issuers/import',
        title: 'Import issuer · Trusty CA',
        loadComponent: () => import('../issuers/import-issuer').then((m) => m.ImportIssuer),
      },
      {
        path: 'issuers/:id',
        title: 'Issuer · Trusty CA',
        providers: [IssuerPage],
        loadComponent: () => import('../issuers/issuer-details').then((m) => m.IssuerDetails),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          {
            path: 'overview',
            loadComponent: () => import('../issuers/issuer-overview').then((m) => m.IssuerOverview),
          },
          {
            path: 'chain',
            loadComponent: () => import('../issuers/issuer-chain').then((m) => m.IssuerChain),
          },
          {
            path: 'profiles',
            loadComponent: () => import('../issuers/issuer-profiles').then((m) => m.IssuerProfiles),
          },
          {
            path: 'configuration',
            loadComponent: () =>
              import('../issuers/issuer-configuration').then((m) => m.IssuerConfiguration),
          },
        ],
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
