import { describe, it, expect } from "vitest";
import {
  resolveAuthRequirement,
  PROTECTED_PAGE_ROUTES,
  AUTH_EXEMPT_API,
} from "./auth-routes";

describe("Auth Route Decision", () => {
  it("WhenProtectedPageWithoutSession_ThenRedirectToLogin", () => {
    for (const route of PROTECTED_PAGE_ROUTES) {
      const decision = resolveAuthRequirement(route);
      expect(decision.requiresAuth).toBe(true);
      expect(decision.responseKind).toBe("redirect");
    }
  });

  it("WhenProtectedApiWithoutSession_ThenReturn401", () => {
    const decision = resolveAuthRequirement("/api/videos");
    expect(decision.requiresAuth).toBe(true);
    expect(decision.responseKind).toBe("json401");
  });

  it("WhenHealthEndpoint_ThenNoAuthRequired", () => {
    expect(resolveAuthRequirement("/api/health").requiresAuth).toBe(false);
  });

  it("WhenLoginPage_ThenNoAuthRequired", () => {
    expect(resolveAuthRequirement("/login").requiresAuth).toBe(false);
  });

  it("WhenPublicRoute_ThenNoAuthRequired", () => {
    expect(resolveAuthRequirement("/").requiresAuth).toBe(false);
    expect(resolveAuthRequirement("/watch/abc-123").requiresAuth).toBe(false);
  });

  it("WhenExemptApiRoutes_ThenMatchExactly", () => {
    for (const exempt of AUTH_EXEMPT_API) {
      expect(resolveAuthRequirement(exempt).requiresAuth).toBe(false);
    }
  });
});
