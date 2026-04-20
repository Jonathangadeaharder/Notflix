export const PROTECTED_PAGE_ROUTES = ["/studio", "/profile", "/vocabulary"];
export const PROTECTED_API_PREFIX = "/api/";
export const AUTH_EXEMPT_API = new Set(["/api/health"]);

export interface AuthDecision {
  requiresAuth: boolean;
  responseKind: "none" | "redirect" | "json401";
}

export function resolveAuthRequirement(pathname: string): AuthDecision {
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some((r) =>
    pathname.startsWith(r),
  );
  const isProtectedApi =
    pathname.startsWith(PROTECTED_API_PREFIX) && !AUTH_EXEMPT_API.has(pathname);

  if (isProtectedPage) return { requiresAuth: true, responseKind: "redirect" };
  if (isProtectedApi) return { requiresAuth: true, responseKind: "json401" };
  return { requiresAuth: false, responseKind: "none" };
}
