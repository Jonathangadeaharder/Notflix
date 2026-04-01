import { test, expect } from "@playwright/test";
import { PlayerPage } from "../pages/PlayerPage";

const FAKE_TIME = 2;
const FAKE_DURATION = 600;

test.describe("Video Player Component", () => {
    test("loads and toggles subtitle modes", async ({ page }) => {
        // Suppress video error events before page loads.
        // In headless CI, Chromium may lack codecs for BigBuckBunny.mp4,
        // which triggers handleVideoError → errorState → hides controls + subtitles.
        await page.addInitScript(() => {
            const origAEL = HTMLVideoElement.prototype.addEventListener;
            HTMLVideoElement.prototype.addEventListener = function (
                type: string,
                listener: EventListenerOrEventListenerObject,
                options?: boolean | AddEventListenerOptions,
            ) {
                // Swallow error listeners on video elements
                if (type === "error") return;
                return origAEL.call(this, type, listener, options);
            };
        });

        // Go to the test page
        await page.goto("/test/player");

        const player = new PlayerPage(page);
        // Wait for player element to exist
        await expect(player.videoPlayer).toBeVisible();

        // Simulate video at 2s so subtitles render (first subtitle: start=1, end=5)
        await page.evaluate(
            ({ time, dur }) => {
                const v = document.querySelector("video") as HTMLVideoElement;
                if (v) {
                    Object.defineProperty(v, "currentTime", {
                        get: () => time,
                        set: () => {},
                        configurable: true,
                    });
                    Object.defineProperty(v, "duration", {
                        get: () => dur,
                        configurable: true,
                    });
                    v.dispatchEvent(new Event("timeupdate"));
                }
            },
            { time: FAKE_TIME, dur: FAKE_DURATION },
        );

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
