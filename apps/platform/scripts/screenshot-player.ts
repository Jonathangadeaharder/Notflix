import { chromium } from '@playwright/test';

async function captureVideoPlayer() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width: 1549, height: 1064 }
    });

    try {
        // Navigate to a watch page - use a test video ID
        await page.goto('http://localhost:5174/watch/test-video-1', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // Wait for the video player container to be visible
        await page.waitForSelector('[data-testid="video-player"]', { timeout: 10000 }).catch(() => {
            console.log('Video player element not found, capturing page anyway');
        });

        // Wait a bit for any animations to settle
        await page.waitForTimeout(1000);

        // Capture the full page screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `./report/screenshot-player-${timestamp}.png`;
        
        await page.screenshot({
            path: screenshotPath,
            fullPage: false
        });

        console.log(`Screenshot saved to: ${screenshotPath}`);

    } catch (error) {
        console.error('Error capturing screenshot:', error);
    } finally {
        await browser.close();
    }
}

captureVideoPlayer();
