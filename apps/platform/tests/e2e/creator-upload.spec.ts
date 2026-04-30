import path from 'node:path';
import { expect, request, test } from '@playwright/test';
import { StudioPage } from '../pages/StudioPage';
import { UploadPage } from '../pages/UploadPage';

const COMPLETED_TIMEOUT_MS = 60000;

let uploadedVideoId: string | undefined;

test.describe('Creator Journey: Asynchronous Media Pipeline', () => {
  test('Should upload video and handle processing status transitions', async ({
    page,
  }) => {
    const studioPage = new StudioPage(page);
    const uploadPage = new UploadPage(page);

    await page.goto('/studio/upload');

    const uniqueTitle = `E2E Creator Flow ${Date.now()}`;
    const audioPath = path.resolve(
      process.cwd(),
      '../../media',
      'test_audio.mp3',
    );

    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error(`[Browser] ${msg.text()}`);
    });

    await uploadPage.uploadVideo(uniqueTitle, audioPath);

    // 1. Verify upload succeeded — the video card is visible on the studio page
    const videoCard = page.locator(`[data-testid="video-item"]`, {
      hasText: uniqueTitle,
    });
    await expect(videoCard).toBeVisible();

    // Wait for either PENDING or COMPLETED on this specific card (avoids global match + race)
    const pendingOrCompleted = videoCard.locator(
      '[data-testid="status-PENDING"], [data-testid="status-COMPLETED"]',
    );
    await expect(pendingOrCompleted).toBeVisible({
      timeout: COMPLETED_TIMEOUT_MS,
    });
    await studioPage.waitForVideoStatus(
      uniqueTitle,
      'COMPLETED',
      COMPLETED_TIMEOUT_MS,
    );
    const watchLink = videoCard.locator('a[href^="/watch/"]').first();
    await expect(watchLink).toBeVisible();

    const href = await watchLink.getAttribute('href');
    uploadedVideoId = href?.split('/watch/')[1];
  });

  test.afterAll(async () => {
    if (!uploadedVideoId) return;
    const ctx = await request.newContext({
      baseURL: 'http://localhost:5173',
    });
    const resp = await ctx.delete(`/api/videos/${uploadedVideoId}`);
    if (!resp.ok()) {
      console.warn(
        `[Cleanup] Failed to delete uploaded video ${uploadedVideoId}: ${resp.status()}`,
      );
    }
    await ctx.dispose();
  });
});
