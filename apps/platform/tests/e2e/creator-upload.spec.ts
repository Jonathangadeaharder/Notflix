import { test, expect } from '@playwright/test';
import path from 'path';
import { StudioPage } from '../pages/StudioPage';
import { UploadPage } from '../pages/UploadPage';

test.describe('Creator Journey: Asynchronous Media Pipeline', () => {
    test('Should upload video and smoothly transition through Processing statuses', async ({ page }) => {
        const studioPage = new StudioPage(page);
        const uploadPage = new UploadPage(page);

        await studioPage.goto();
        await studioPage.clickUpload();

        const uniqueTitle = `E2E Creator Flow ${Date.now()}`;
        const audioPath = path.resolve(process.cwd(), '../../media', 'test_audio.mp3');

        page.on('console', msg => {
            if (msg.type() === 'error') console.error(`[Browser] ${msg.text()}`);
        });

        await uploadPage.uploadVideo(uniqueTitle, audioPath);

        // 1. Explicitly verify Pending state representation
        await expect(page.locator(`[data-testid="video-item"]`, { hasText: uniqueTitle })).toBeVisible();
        await expect(page.locator(`[data-testid="status-PENDING"]`).first()).toBeVisible();

        // 2. Await Choreography Event Bus Resolution (Simulated by backend timeout + mocking)
        const PROCESSING_TIMEOUT_MS = 60000;
        await studioPage.waitForVideoStatus(uniqueTitle, 'COMPLETED', PROCESSING_TIMEOUT_MS);

        // 3. Ensure UI transitions smoothly to proper Call to Action
        const videoCard = page.locator(`[data-testid="video-item"]`, { hasText: uniqueTitle });
        const watchLink = videoCard.locator('a[href^="/watch/"]').first();
        await expect(watchLink).toBeVisible();
    });
});
