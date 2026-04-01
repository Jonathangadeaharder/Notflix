import { test, expect } from "@playwright/test";
import { PlayerPage } from "../pages/PlayerPage";

test.describe("Video Player Component", () => {
    // Skip in CI: headless Chromium lacks codecs for BigBuckBunny.mp4,
    // causing errorState that hides subtitles/controls. The full-flow
    // and transcription E2E tests validate real playback in CI.
    test.skip(!!process.env.CI, "Headless Chromium lacks video codecs");

    test("loads and toggles subtitle modes", async ({ page }) => {
        await page.goto("/test/player");

        const player = new PlayerPage(page);
        await player.waitForPlayback();

        // Force video time to 2s to trigger subtitles (first subtitle: start=1, end=5)
        await page.evaluate(() => {
            const v = document.querySelector("video") as HTMLVideoElement;
            if (v) v.currentTime = 2;
        });

        // Check if subtitles appear
        await expect(player.subtitleContainer).toBeVisible({ timeout: 10000 });

        // Assert FILTERED mode (Translation visible, Separator visible)
        await expect(player.subtitleBtn).toHaveText("FILTERED");

        const translationText = page.locator("text='Hello world'");
        await expect(translationText).toBeVisible();

        // 2. Toggle to DUAL
        await player.subtitleBtn.click();
        await expect(player.subtitleBtn).toHaveText("DUAL");
        await expect(translationText).toBeVisible();

        // 3. Toggle to ORIGINAL
        await player.subtitleBtn.click();
        await expect(player.subtitleBtn).toHaveText("ORIGINAL");
        await expect(translationText).not.toBeVisible();
        const wordBtn = player.subtitleContainer.getByText("Hola", { exact: true });
        await expect(wordBtn).toBeVisible();

        // 4. Toggle to OFF
        await player.subtitleBtn.click();
        await expect(player.subtitleContainer).not.toBeVisible();
        await expect(player.subtitleBtn).toHaveText("CC");

        // 5. Toggle back to FILTERED
        await player.subtitleBtn.click();
        await expect(player.subtitleBtn).toHaveText("FILTERED");
        await expect(player.subtitleContainer).toBeVisible();
    });
});
