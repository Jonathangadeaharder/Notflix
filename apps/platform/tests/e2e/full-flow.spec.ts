import { test, expect } from "@playwright/test";
import path from "path";
import { StudioPage } from "../pages/StudioPage";
import { UploadPage } from "../pages/UploadPage";
import { PlayerPage } from "../pages/PlayerPage";

test.describe("Full User Flow", () => {
  test("Upload, Process, and Play Video", async ({ page }) => {
    const studioPage = new StudioPage(page);
    const uploadPage = new UploadPage(page);
    const playerPage = new PlayerPage(page);

    // Debug: Log all console messages from the browser
    page.on("console", (msg) =>
      console.log(`[Browser] ${msg.type()}: ${msg.text()}`),
    );

    // Mock API early
    await page.route("**/api/game/generate*", async (route) => {
      console.log("[Mock] Intercepted /api/game/generate");
      const json = {
        nextChunkStart: 600,
        cards: [
          {
            lemma: "gato",
            lang: "es",
            original: "gato",
            contextSentence: "El gato está en la mesa.",
            cefr: "A1",
            translation: "cat",
            isKnown: false,
          },
        ],
      };
      await route.fulfill({ json });
    });

    // 1. Navigate to Studio
    await studioPage.goto();

    // 2. Go to Upload
    await studioPage.clickUpload();

    // 3. Upload Video
    const uniqueTitle = `Full Flow Test ${Date.now()}`;
    const audioPath = path.resolve(
      process.cwd(),
      "../../media",
      "test_audio.mp3",
    );

    await uploadPage.uploadVideo(uniqueTitle, audioPath);

    // 4. Wait for Processing
    console.log(`Waiting for video "${uniqueTitle}" to complete processing...`);
    const PROCESSING_TIMEOUT_MS = 60000;
    await studioPage.waitForVideoStatus(
      uniqueTitle,
      "COMPLETED",
      PROCESSING_TIMEOUT_MS,
    );

    // 5. Navigate to Watch Page
    const videoCard = page.locator(`[data-testid="video-item"]`, {
      hasText: uniqueTitle,
    });
    const watchLink = videoCard.locator('a[href^="/watch/"]').first();
    await expect(watchLink).toBeVisible();

    await Promise.all([page.waitForURL(/\/watch\/.+/), watchLink.click()]);

    // 6. Verify Player
    console.log("Current URL after click:", page.url());
    const content = await page.content();
    expect(
      content,
      'Video player should be visible, not "Video not found" error',
    ).not.toContain("Video not found");
    await playerPage.waitForPlayback();

    // 7. Verify Game Overlay Interaction (enabled by TEST_GAME_INTERVAL=0.1)
    console.log("Waiting for Game Overlay to appear (approx 6s)...");
    // We wait slightly longer than 6s to be safe
    await playerPage.playRound(1);

    // Verify overlay is gone and playback resumed (optional, but good)
    await expect(playerPage.gameOverlay).not.toBeVisible();
  });
});
