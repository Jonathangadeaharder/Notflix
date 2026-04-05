/**
 * Minimal hydration check for /watch/[id].
 * Used during binary-search debugging of silent Svelte 5 hydration failure.
 * 
 * Run: npx playwright test tests/e2e/hydration-check.spec.ts
 */
import { test, expect } from '@playwright/test';

test('watch page onMount fires (hydration check)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    // Step 1: Get a real video ID from the studio page
    await page.goto('/studio');
    await page.waitForLoadState('load');

    const watchLink = page.locator('a[href^="/watch/"]').first();
    await watchLink.waitFor({ state: 'visible', timeout: 15000 });
    const href = await watchLink.getAttribute('href');
    expect(href).toBeTruthy();

    // Step 2: Navigate directly to watch page
    await page.goto(href!);
    await page.waitForLoadState('load');

    // Step 3: Check if onMount fired (it registers a tiny marker)
    const hydrated = await page.waitForFunction(
        () => typeof (window as any).__e2eHydrated === 'boolean' && (window as any).__e2eHydrated === true,
        { timeout: 15000 }
    ).catch(() => null);

    if (!hydrated) {
        console.error('onMount never fired! Page errors:', pageErrors);
    }

    expect(pageErrors, `JS errors on page: ${pageErrors.join('; ')}`).toHaveLength(0);
    expect(hydrated, 'window.__e2eHydrated was never set — onMount did not fire').not.toBeNull();
});
