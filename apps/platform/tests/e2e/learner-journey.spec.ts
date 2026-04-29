import path from 'node:path';
import { expect, test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { PlayerPage } from '../pages/PlayerPage';
import { ProfilePage } from '../pages/ProfilePage';
import { StudioPage } from '../pages/StudioPage';
import { UploadPage } from '../pages/UploadPage';
import { VocabularyPage } from '../pages/VocabularyPage';

const E2E_VIDEO_1 = '00000000-e2e0-4000-b000-000000000001';
const COMPLETED_TIMEOUT_MS = 60000;

test.describe('E2E Learner Journey', () => {
  test('complete journey: home → profile → studio → upload → watch → vocabulary', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // ─── 1. Home page loads with navigation ───
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(page.locator('nav')).toBeVisible();

    const navTexts = await homePage.getNavLinkTexts();
    expect(navTexts.length).toBeGreaterThan(0);

    // ─── 2. Navigate to Profile — verify language display ───
    const profileLink = page.locator('nav a[href*="profile"]').first();
    await profileLink.click();
    await expect(page).toHaveURL(/\/profile/);

    const profilePage = new ProfilePage(page);
    await profilePage.expectHeadingVisible();

    const gameInterval = await profilePage.getGameInterval();
    expect(gameInterval).toBeTruthy();

    // ─── 3. Navigate to Studio ───
    const studioLink = page.locator('nav a[href*="studio"]').first();
    await studioLink.click();
    await expect(page).toHaveURL(/\/studio/);

    const studioPage = new StudioPage(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // ─── 4. Upload a video via the upload page ───
    await studioPage.clickUpload();
    await expect(page).toHaveURL(/\/upload/);

    const uploadPage = new UploadPage(page);
    const uniqueTitle = `E2E Journey Video ${Date.now()}`;
    const audioPath = path.resolve(
      process.cwd(),
      '../../media',
      'test_audio.mp3',
    );

    await uploadPage.uploadVideo(uniqueTitle, audioPath);

    const videoCard = page.locator(`[data-testid="video-item"]`, {
      hasText: uniqueTitle,
    });
    await expect(videoCard).toBeVisible({ timeout: 15000 });

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

    const uploadedWatchLink = videoCard.locator('a[href^="/watch/"]').first();
    await expect(uploadedWatchLink).toBeVisible();

    // ─── 5. Watch the seeded COMPLETED video ───
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

    await page.goto(`/watch/${E2E_VIDEO_1}`);
    await page.waitForLoadState('load');

    const playerPage = new PlayerPage(page);
    await playerPage.waitForPlayback();

    const HOOK_TIMEOUT = 30000;
    await page.waitForFunction(
      () => typeof (window as any).__e2eTriggerGameInterrupt === 'function',
      { timeout: HOOK_TIMEOUT },
    );

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
    await page.waitForTimeout(1000);

    await playerPage.playRound(1);
    await expect(playerPage.gameOverlay).not.toBeVisible();

    // Verify interactive subtitles if available
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

    // ─── 6. Navigate to Vocabulary ───
    const vocabLink = page.locator('nav a[href*="vocabulary"]').first();
    await vocabLink.click();
    await expect(page).toHaveURL(/\/vocabulary/);

    const vocabPage = new VocabularyPage(page);
    await expect(vocabPage.heading).toContainText(/vocabulary/i);

    const toggleButtons = page.locator("[data-testid^='toggle-known-']");
    expect(await toggleButtons.count()).toBeGreaterThan(0);

    // Filter by level
    await expect(
      page.locator("button:has-text('A1 · Beginner')"),
    ).toBeVisible();
    await vocabPage.filterByLevel('A1');

    const a1Words = await vocabPage.getVisibleWordTexts();
    expect(a1Words.length).toBeGreaterThan(0);

    // Clear filter, search for a known word
    await vocabPage.goto();
    await vocabPage.search('hola');

    const holaToggle = vocabPage.toggleKnownButton('hola');
    await expect(holaToggle).toBeVisible({ timeout: 10000 });

    // Verify no page-level errors occurred during the journey
    expect(pageErrors).toHaveLength(0);
  });
});
