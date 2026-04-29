import { expect, test } from '@playwright/test';
import { StudioPage } from '../pages/StudioPage';

test.describe('Studio: Video Browsing', () => {
  test('displays seeded video cards', async ({ page }) => {
    const studio = new StudioPage(page);
    await studio.goto();

    // Verify seeded COMPLETED video is visible
    const completedCard = page.locator('[data-testid="video-item"]', {
      hasText: 'E2E Completed Video',
    });
    await expect(completedCard).toBeVisible();

    // Verify seeded PENDING video is visible
    const pendingCard = page.locator('[data-testid="video-item"]', {
      hasText: 'E2E Pending Video',
    });
    await expect(pendingCard).toBeVisible();

    // Verify the unprocessed video is also visible (no status badge expected)
    const unprocessedCard = page.locator('[data-testid="video-item"]', {
      hasText: 'E2E Unprocessed Video',
    });
    await expect(unprocessedCard).toBeVisible();
  });

  test('upload link navigates to upload page', async ({ page }) => {
    const studio = new StudioPage(page);
    await studio.goto();
    await studio.clickUpload();
    await expect(page).toHaveURL(/\/studio\/upload/);
  });

  test('completed video card links to watch page', async ({ page }) => {
    const studio = new StudioPage(page);
    await studio.goto();

    const completedCard = page.locator('[data-testid="video-item"]', {
      hasText: 'E2E Completed Video',
    });
    const watchLink = completedCard.locator('a[href^="/watch/"]').first();
    await expect(watchLink).toBeVisible();

    const href = await watchLink.getAttribute('href');
    expect(href).toMatch(/\/watch\/00000000-e2e0-4000-b000-000000000001/);
  });
});
