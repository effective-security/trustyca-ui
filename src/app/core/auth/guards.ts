import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore, hasConsoleRole } from './auth.store';
import { HOME_ROUTE, safeReturnUrl } from './return-url';

/** A signed-in user passes; anyone else goes to the login with the requested URL */
export const authGuard: CanActivateFn = (_route, state) =>
  inject(AuthStore).isAuthenticated() ||
  inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: safeReturnUrl(state.url) || undefined },
  });

/**
 * A user with a role in the selected org passes; a user without a role in
 * it gets the no-role notice, and a user without an org picks one or learns
 * there is none. The scope loads once per org; when it cannot load, the
 * page opens and shows the failure of its own calls, and the server
 * authorizes every call either way.
 */
export const orgGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (auth.orgId()) {
    try {
      return hasConsoleRole(await auth.loadSession()) || router.parseUrl('/auth/norole');
    } catch {
      return true;
    }
  }
  try {
    return router.parseUrl(await auth.noOrgRoute());
  } catch {
    return router.parseUrl('/auth/noorg');
  }
};

/** The login page of a signed-in user opens the requested page instead */
export const loginGuard: CanActivateFn = (route) =>
  !inject(AuthStore).isAuthenticated() ||
  inject(Router).parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl')) || HOME_ROUTE);
