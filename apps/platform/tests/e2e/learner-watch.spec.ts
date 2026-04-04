import { test, expect } from '@playwright/test';
import { PlayerPage } from '../pages/PlayerPage';

test.describe('Learner Journey: Interactive Video Player', () => {
    // Skip: The watch page's Svelte 5 client hydration doesn't complete in headless Chromium CI
    // (onMount never fires), so the game overlay can't be tested. Works locally.
    // TODO: Re-enable when Svelte 5 hydration + Vite dev server + headless Chromium is stable.
    test.skip('Should seamlessly interrupt video and resume upon knowledge check completion', async ({ page }) => {
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
        await page.waitForLoadState('load');
        
        // Find FIRST valid video
        const watchLink = page.locator('a[href^="/watch/"]').first();
        await watchLink.waitFor({ state: 'visible', timeout: 30000 });
        await watchLink.click();

        await playerPage.waitForPlayback();

        // Wait for the E2E test hook to be registered by onMount (hydration must complete)
        await page.waitForFunction(
            () => typeof (window as any).__e2eTriggerGameInterrupt === 'function',
            { timeout: 10000 }
        );

        // Trigger the game interrupt directly by injecting card data into the component state.
        // This bypasses Svelte 5's event system AND the fetch/route-interception chain entirely.
        await page.evaluate(() => {
            (window as any).__e2eTriggerGameInterrupt([{
                lemma: 'murciélago',
                lang: 'es',
                original: 'murciélago',
                contextSentence: 'El murciélago vuela por la noche.',
                cefr: 'B2',
                translation: 'bat',
                isKnown: false
            }]);
        });
        // Allow Svelte to process the state update and render the overlay
        await page.waitForTimeout(1000);

        // 3. Verify structural component logic fires
        await playerPage.playRound(1);
        
        await expect(playerPage.gameOverlay).not.toBeVisible();

        // 4. Verify interactive subtitles (Hovering, pop-ups, marking words)
        // Since we mocked the game round, the video should resume.
        // We interact with the subtitle elements dynamically.
        const firstWord = page.getByTestId('subtitle-word').first();
        await expect(firstWord).toBeVisible({ timeout: 10000 });

        // Hover over word to open popup
        await firstWord.hover();
        
        const popup = page.getByTestId('word-popup');
        await expect(popup).toBeVisible();

        // Click to pin
        await firstWord.click();

        // Click mark known
        const markKnownBtn = page.getByRole('button', { name: "Mark Known" });
        await expect(markKnownBtn).toBeVisible();

        // Verify API intercept fired correctly
        const [request] = await Promise.all([
            page.waitForRequest(req => req.url().includes('/api/words/known') && req.method() === 'POST'),
            markKnownBtn.click()
        ]);

        expect(request.postDataJSON()).toMatchObject({
             lang: expect.any(String)
        });

        // Popup should disappear after marking
        await expect(popup).not.toBeVisible();
    });
});
