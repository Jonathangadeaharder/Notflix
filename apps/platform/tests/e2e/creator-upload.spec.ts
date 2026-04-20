import { test, expect } from '@playwright/test';
import path from 'path';
import { StudioPage } from '../pages/StudioPage';
import { UploadPage } from '../pages/UploadPage';

const COMPLETED_TIMEOUT_MS = 60000;

test.describe('Creator Journey: Asynchronous Media Pipeline', () => {
    test('Should upload video and handle processing status transitions', async ({ page }) => {
        const studioPage = new StudioPage(page);
        const uploadPage = new UploadPage(page);

        await page.goto('/studio/upload');

        const uniqueTitle = `E2E Creator Flow ${Date.now()}`;
        const audioPath = path.resolve(process.cwd(), '../../media', 'test_audio.mp3');

        page.on('console', msg => {
            if (msg.type() === 'error') console.error(`[Browser] ${msg.text()}`);
        });

        await uploadPage.uploadVideo(uniqueTitle, audioPath);

        // 1. Verify upload succeeded — the video card is visible on the studio page
        const videoCard = page.locator(`[data-testid="video-item"]`, { hasText: uniqueTitle });
        await expect(videoCard).toBeVisible();

        // Mock AI service processes the video successfully in both CI and local
        await expect(page.locator(`[data-testid="status-PENDING"]`).first()).toBeVisible();
        await studioPage.waitForVideoStatus(uniqueTitle, 'COMPLETED', COMPLETED_TIMEOUT_MS);
        const watchLink = videoCard.locator('a[href^="/watch/"]').first();
        await expect(watchLink).toBeVisible();
    });
});
