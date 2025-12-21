import { test, expect } from '@playwright/test';
import path from 'path';
import { StudioPage } from '../pages/StudioPage';
import { UploadPage } from '../pages/UploadPage';
import { PlayerPage } from '../pages/PlayerPage';

test.describe('Full User Flow', () => {
    test('Upload, Process, and Play Video', async ({ page }) => {
        const studioPage = new StudioPage(page);
        const uploadPage = new UploadPage(page);
        const playerPage = new PlayerPage(page);

        // 1. Navigate to Studio
        await studioPage.goto();

        // 2. Go to Upload
        await studioPage.clickUpload();

        // 3. Upload Video
        const uniqueTitle = `Full Flow Test ${Date.now()}`;
        const audioPath = path.resolve(process.cwd(), '../../media', 'test_audio.mp3');

        await uploadPage.uploadVideo(uniqueTitle, audioPath);

        // 4. Wait for Processing
        console.log(`Waiting for video "${uniqueTitle}" to complete processing...`);
        await studioPage.waitForVideoStatus(uniqueTitle, 'COMPLETED', 60000);

        // 5. Navigate to Watch Page
        const videoCard = page.locator(`[data-testid="video-item"]`, { hasText: uniqueTitle });
        const watchLink = videoCard.locator('a[href^="/watch/"]').first();
        await expect(watchLink).toBeVisible();
        
        await Promise.all([
            page.waitForURL(/\/watch\/.+/),
            watchLink.click()
        ]);

        // 6. Verify Player
        console.log('Current URL after click:', page.url());
        const content = await page.content();
        if (content.includes('Video not found')) {
            console.error('❌ DEBUG: Page shows "Video not found"');
        }
        await playerPage.waitForPlayback();
    });
});