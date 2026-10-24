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
    ],
  },
];
