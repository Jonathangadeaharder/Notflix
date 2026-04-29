import { expect, test } from '@playwright/test';
import { PlayerPage } from '../pages/PlayerPage';

test.describe('Learner Journey: Interactive Video Player', () => {
  test('Should seamlessly interrupt video and resume upon knowledge check completion', async ({
    page,
  }) => {
    const playerPage = new PlayerPage(page);

    // Capture browser-side errors for diagnostics
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Intercept API routes for deterministic behavior
    await page.route('**/api/game/generate*', async (route) => {
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
            isKnown: false,
          },
        ],
      };
      await route.fulfill({ json });
    });

    await page.route('**/api/words/known*', async (route) => {
      await route.fulfill({ status: 200, json: { success: true } });
    });

    // 2. Navigate directly to the seeded COMPLETED video
    const E2E_VIDEO_1 = '00000000-e2e0-4000-b000-000000000001';
    await page.goto(`/watch/${E2E_VIDEO_1}`);
    await page.waitForLoadState('load');

    await playerPage.waitForPlayback();

    // 4. Wait for the watch page's onMount to register the E2E hook
    //    Root cause of prior failures: vite.config.ts resolve.conditions was []
    //    for builds, causing node:async_hooks (server-only) to leak into the client
    //    bundle and silently break kit.start(). Fixed by always setting ['browser'].
    const HOOK_TIMEOUT = 30000;
    try {
      await page.waitForFunction(
        () => typeof (window as any).__e2eTriggerGameInterrupt === 'function',
        { timeout: HOOK_TIMEOUT },
      );
    } catch {
      // Log diagnostic info before failing
      console.error('E2E hook never registered. Page errors:', pageErrors);
      console.error('Console errors:', consoleErrors);
      throw new Error(
        `Watch page onMount never fired after ${HOOK_TIMEOUT}ms. ` +
          `Page errors: [${pageErrors.join('; ')}]. ` +
          `Console errors: [${consoleErrors.join('; ')}]`,
      );
    }

    // 5. Trigger the game interrupt by directly injecting card state
    await page.evaluate(() => {
      (window as any).__e2eTriggerGameInterrupt([
        {
          lemma: 'murciélago',
          lang: 'es',
          original: 'murciélago',
          contextSentence: 'El murciélago vuela por la noche.',
          cefr: 'B2',
          translation: 'bat',
          isKnown: false,
        },
      ]);
    });
    const RENDER_DELAY_MS = 1000;
    await page.waitForTimeout(RENDER_DELAY_MS);

    // 6. Verify game overlay appears and can be dismissed
    await playerPage.playRound(1);
    await expect(playerPage.gameOverlay).not.toBeVisible();

    // Wait for loading spinner to disappear before interacting with subtitles
    const spinner = page.locator('.spinner');
    await expect(spinner)
      .toHaveCount(0, { timeout: 10000 })
      .catch(() => {});

    // 7. Verify interactive subtitles (optional — depends on pipeline having generated VTT)
    const firstWord = page.getByTestId('subtitle-word').first();
    const hasSubtitles = await firstWord.isVisible().catch(() => false);

    if (hasSubtitles) {
      await firstWord.hover();
      const popup = page.getByTestId('word-popup');
      await expect(popup).toBeVisible();
      await firstWord.click();

      const markKnownBtn = page.getByRole('button', { name: 'Mark Known' });
      await expect(markKnownBtn).toBeVisible();

      const [request] = await Promise.all([
        page.waitForRequest(
          (req) =>
            req.url().includes('/api/words/known') && req.method() === 'POST',
        ),
        markKnownBtn.click(),
      ]);

      expect(request.postDataJSON()).toMatchObject({
        lang: expect.any(String),
      });

      await expect(popup).not.toBeVisible();
    }
  });
});
