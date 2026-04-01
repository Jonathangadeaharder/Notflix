import { test, expect } from "@playwright/test";
import { PlayerPage } from "../pages/PlayerPage";

test.describe("Video Player Component", () => {
    test("loads and toggles subtitle modes", async ({ page }) => {
        // Go to the test page
        await page.goto("/test/player");

        const player = new PlayerPage(page);
        await player.waitForPlayback();

        // 1. Initial State: FILTERED
        // Force video time to 2s — override getter so handleTimeUpdate reads it correctly
        // (in headless CI, video may fail to load and reset currentTime to 0)
        await page.evaluate(() => {
            const v = document.querySelector("video") as HTMLVideoElement;
            if (v) {
                const FAKE_TIME = 2;
                const FAKE_DURATION = 600;
                Object.defineProperty(v, "currentTime", {
                    get: () => FAKE_TIME,
                    set: () => {},
                    configurable: true,
                });
                Object.defineProperty(v, "duration", {
                    get: () => FAKE_DURATION,
                    configurable: true,
                });
                v.dispatchEvent(new Event("timeupdate"));
            }
        });

        // Check if subtitles appear
        await expect(player.subtitleContainer).toBeVisible({ timeout: 10000 });

        // Assert FILTERED mode (Translation visible, Separator visible)
        // Implementation detail: "FILTERED" is default state in +page.svelte (Wait, VideoPlayer default is FILTERED)
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
        // Translation should be hidden
        await expect(translationText).not.toBeVisible();
        // Original text "Hola mundo" should be visible (it's inside button elements)
        const wordBtn = player.subtitleContainer.getByText("Hola", { exact: true });
        await expect(wordBtn).toBeVisible();

        // 4. Toggle to OFF
        await player.subtitleBtn.click();
        // Wait for subtitle container to disappear
        await expect(player.subtitleContainer).not.toBeVisible();
        await expect(player.subtitleBtn).toHaveText("CC"); // OFF mode shows "CC" icon or text? 
        // In VideoPlayer.svelte: {subtitleMode === "OFF" ? "CC" : subtitleMode}
        await expect(player.subtitleBtn).toHaveText("CC");

        // 5. Toggle back to FILTERED
        await player.subtitleBtn.click();
        await expect(player.subtitleBtn).toHaveText("FILTERED");
        await expect(player.subtitleContainer).toBeVisible();
    });
});
