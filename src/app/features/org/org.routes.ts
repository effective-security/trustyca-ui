import { Routes } from '@angular/router';

/** The tabs of the organization page (DESIGN.md section 8.7) */
export const ORG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./organization').then((m) => m.Organization),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'general' },
      {
        path: 'general',
        title: 'Organization · Trusty CA',
        loadComponent: () => import('./org-general').then((m) => m.OrgGeneral),
      },
      {
        path: 'projects',
        title: 'Projects · Trusty CA',
        loadComponent: () => import('./org-projects').then((m) => m.OrgProjects),
      },
      {
        path: 'members',
        title: 'Members · Trusty CA',
        loadComponent: () => import('./org-members').then((m) => m.OrgMembers),
      },
      {
        path: 'api-keys',
        title: 'API keys · Trusty CA',
        loadComponent: () => import('./org-api-keys').then((m) => m.OrgApiKeys),
      },
    ],
  },
];
