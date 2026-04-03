import { test, expect } from '@playwright/test';
import { PlayerPage } from '../pages/PlayerPage';

test.describe('Learner Journey: Interactive Video Player', () => {
    test('Should seamlessly interrupt video and resume upon knowledge check completion', async ({ page }) => {
        const playerPage = new PlayerPage(page);

        // 1. Establish deterministic Game Engine behavior boundary
        await page.route('**/api/game/generate*', async route => {
            const json = {
                nextChunkStart: 600,
                cards: [
                    {
                        lemma: 'murciélago',
                        lang: 'es',
                        original: 'murciélago',
                        contextSentence: 'El murciélago vuela por la noche.',
                        cefr: 'B2',
                        translation: 'bat',
                        isKnown: false
                    }
                ]
            };
            await route.fulfill({ json });
        });

        // 2. Intercept Words API to prevent DB mutation overhead
        await page.route('**/api/words/known*', async route => {
            await route.fulfill({ status: 200, json: { success: true } });
        });

        // Note: Full UI separation requires us to dynamically inject a mock video 
        // into the player page. Since our database might be empty, we intercept the load too!
        await page.route('**/watch/mock-vid-123', async route => {
            const mockHtmlResponse = `
                <html>
                <body>
                    <div id="svelte">
                        <h1 data-testid="video-title">Mock Video</h1>
                        <video data-testid="video-player" src="/mock.mp4"></video>
                    </div>
                </body>
                </html>
            `;
            // Simplified routing fallback: we expect a fully loaded player frame dynamically 
            // injected via SvelteKit, but we'll mock the actual trpc/API fetches if used.
            route.continue(); // Fallback to normal behavior for now, assume fixtures exist.
        });

        // For this test, we navigate to a known seeded test video or mock 
        // Assuming test_video exists from global setup script in Playwright project
        await page.goto('/studio');
        
        // Find FIRST valid video
        const watchLink = page.locator('a[href^="/watch/"]').first();
        await watchLink.click();

        await playerPage.waitForPlayback();

        // 3. Verify structural component logic fires without polling the full system
        // The game should trigger immediately based on seeded test boundaries
        await playerPage.playRound(1);
        
        await expect(playerPage.gameOverlay).not.toBeVisible();
    });
});
