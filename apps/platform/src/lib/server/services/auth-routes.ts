export const PROTECTED_PAGE_ROUTES = ['/studio', '/profile', '/vocabulary'];
export const PROTECTED_API_PREFIX = '/api/';
export const AUTH_EXEMPT_API = new Set(['/api/health']);

function stripTrailingSlashes(pathname: string): string {
  let result = pathname;
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

function isExemptApi(pathname: string): boolean {
  return (
    AUTH_EXEMPT_API.has(pathname) ||
    AUTH_EXEMPT_API.has(stripTrailingSlashes(pathname))
  );
}

export interface AuthDecision {
  requiresAuth: boolean;
  responseKind: 'none' | 'redirect' | 'json401';
}

export function resolveAuthRequirement(pathname: string): AuthDecision {
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
  const isProtectedApi =
    pathname.startsWith(PROTECTED_API_PREFIX) && !isExemptApi(pathname);

  if (isProtectedPage) return { requiresAuth: true, responseKind: 'redirect' };
  if (isProtectedApi) return { requiresAuth: true, responseKind: 'json401' };
  return { requiresAuth: false, responseKind: 'none' };
}
