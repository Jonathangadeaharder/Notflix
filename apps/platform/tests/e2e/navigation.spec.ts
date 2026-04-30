import { expect, test } from '@playwright/test';

test.describe('Navigation and Layout', () => {
  test('nav links navigate correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Studio link
    const studioLink = page.locator('nav a[href*="studio"]').first();
    await expect(studioLink).toBeVisible();
    await studioLink.click();
    await expect(page).toHaveURL(/\/studio/);

    // Vocabulary link
    const vocabLink = page.locator('nav a[href*="vocabulary"]').first();
    await expect(vocabLink).toBeVisible();
    await vocabLink.click();
    await expect(page).toHaveURL(/\/vocabulary/);

    // Profile link
    const profileLink = page.locator('nav a[href*="profile"]').first();
    await expect(profileLink).toBeVisible();
    await profileLink.click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('home page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('load');

    // No page-level JavaScript errors
    expect(errors).toHaveLength(0);

    // Title should be set (not "untitled")
    const title = await page.title();
    expect(title.toLowerCase()).not.toContain('untitled');
  });

  test('authenticated pages load under E2E user when PLAYWRIGHT_TEST=true', async ({
    page,
  }) => {
    // Note: In PLAYWRIGHT_TEST=true mode, all requests are auto-authenticated.
    // This test verifies the pages load successfully under the E2E user.
    await page.goto('/studio');
    await page.waitForLoadState('load');

    // Should NOT be on login page (E2E user is auto-authenticated)
    expect(page.url()).toContain('/studio');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
