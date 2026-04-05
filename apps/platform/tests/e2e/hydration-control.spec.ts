/**
 * Hydration check CONTROL TEST — verifies the studio page does hydrate.
 * If this also fails, the problem is global (not watch-page-specific).
 */
import { test, expect } from '@playwright/test';

test('studio page onMount fires (control - hydration check)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto('/studio');
    await page.waitForLoadState('load');

    // The layout sets data-hydrated in onMount — check that
    const hydrated = await page.waitForSelector('html[data-hydrated]', { timeout: 15000 })
        .catch(() => null);

    if (!hydrated) {
        console.error('Layout onMount never fired on /studio! Page errors:', pageErrors);
    }

    expect(pageErrors, `JS errors on studio page: ${pageErrors.join('; ')}`).toHaveLength(0);
    expect(hydrated, 'html[data-hydrated] never appeared on /studio — global hydration failure').not.toBeNull();
});
