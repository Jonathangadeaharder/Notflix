import { describe, expect, it } from 'vitest';
import {
  AUTH_EXEMPT_API,
  PROTECTED_PAGE_ROUTES,
  resolveAuthRequirement,
} from './auth-routes';

describe('Auth Route Decision', () => {
  it('WhenProtectedPageWithoutSession_ThenRedirectToLogin', () => {
    for (const route of PROTECTED_PAGE_ROUTES) {
      const decision = resolveAuthRequirement(route);
      expect(decision.requiresAuth).toBe(true);
      expect(decision.responseKind).toBe('redirect');
    }
  });

  it('WhenProtectedApiWithoutSession_ThenReturn401', () => {
    const decision = resolveAuthRequirement('/api/videos');
    expect(decision.requiresAuth).toBe(true);
    expect(decision.responseKind).toBe('json401');
  });

  it('WhenHealthEndpoint_ThenNoAuthRequired', () => {
    expect(resolveAuthRequirement('/api/health').requiresAuth).toBe(false);
  });

  it('WhenHealthEndpointWithTrailingSlash_ThenNoAuthRequired', () => {
    expect(resolveAuthRequirement('/api/health/').requiresAuth).toBe(false);
  });

  it('WhenLoginPage_ThenNoAuthRequired', () => {
    expect(resolveAuthRequirement('/login').requiresAuth).toBe(false);
  });

  it('WhenPublicRoute_ThenNoAuthRequired', () => {
    expect(resolveAuthRequirement('/').requiresAuth).toBe(false);
    expect(resolveAuthRequirement('/watch/abc-123').requiresAuth).toBe(false);
  });

  it('WhenExemptApiRoutes_ThenMatchExactly', () => {
    for (const exempt of AUTH_EXEMPT_API) {
      expect(resolveAuthRequirement(exempt).requiresAuth).toBe(false);
    }
  });

  it('WhenPrefixSimilarRoute_ThenNoAuthRequired', () => {
    expect(resolveAuthRequirement('/studio-public').requiresAuth).toBe(false);
    expect(resolveAuthRequirement('/profiled').requiresAuth).toBe(false);
    expect(resolveAuthRequirement('/vocabulary-list').requiresAuth).toBe(false);
  });

  it('WhenProtectedSubRoute_ThenRequiresAuth', () => {
    const decision = resolveAuthRequirement('/studio/upload');
    expect(decision.requiresAuth).toBe(true);
    expect(decision.responseKind).toBe('redirect');
  });

  it('WhenApiSubPath_ThenRequiresAuth', () => {
    expect(resolveAuthRequirement('/api/health/status')).toEqual({
      requiresAuth: true,
      responseKind: 'json401',
    });
  });
});
