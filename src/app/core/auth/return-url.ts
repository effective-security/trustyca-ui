/** Where a signed-in user lands when no page was requested */
export const HOME_ROUTE = '/dashboard';

/**
 * Returns the route to open after the sign-in, or '' when the requested
 * URL is not a page of the console: another origin, the login or an auth
 * landing page
 */
export function safeReturnUrl(url: string | null | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return '';
  }
  const path = url.split(/[?#]/)[0];
  if (path === '/login' || path === '/auth' || path.startsWith('/auth/')) {
    return '';
  }
  return url;
}
