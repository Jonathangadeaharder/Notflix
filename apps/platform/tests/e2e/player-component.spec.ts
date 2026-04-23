import { test, expect } from "@playwright/test";
import { PlayerPage } from "../pages/PlayerPage";

test.describe("Video Player Component", () => {
    // Video source is a local WebM (VP8/Vorbis) that all Chromium builds support.
    // Previously used remote BigBuckBunny.mp4 which failed in headless due to H.264 codecs.

    test("loads and toggles subtitle modes", async ({ page }) => {
        await page.goto("/test/player");

        const player = new PlayerPage(page);
        await player.waitForPlayback();

        // Force video time to 2s and pause so subtitles are deterministic
        await page.evaluate(() => {
            const v = document.querySelector("video") as HTMLVideoElement;
            if (!v) return;
            return new Promise<void>((resolve) => {
                const targetTime = 2;
                const seek = () => {
                    v.pause();
                    if (Math.abs(v.currentTime - targetTime) < 0.01) {
                        resolve();
                        return;
                    }
                    v.addEventListener("seeked", () => resolve(), { once: true });
                    v.currentTime = targetTime;
                };
                if (v.readyState >= 1) {
                    seek();
                } else {
                    v.addEventListener("loadedmetadata", () => seek(), { once: true });
                }
            });
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
