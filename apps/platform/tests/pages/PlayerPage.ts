import { type Page, type Locator, expect } from '@playwright/test';

export class PlayerPage {
    readonly page: Page;
    readonly videoPlayer: Locator;
    readonly gameOverlay: Locator;
    readonly swipeRightButton: Locator;
    readonly swipeLeftButton: Locator;
    readonly cardWord: Locator;

    constructor(page: Page) {
        this.page = page;
        this.videoPlayer = page.getByTestId('video-player');
        this.gameOverlay = page.getByTestId('game-overlay');
        this.swipeRightButton = page.getByTestId('swipe-right');
        this.swipeLeftButton = page.getByTestId('swipe-left');
        this.cardWord = page.getByTestId('card-original');
    }

    async waitForPlayback() {
        await expect(this.videoPlayer).toBeVisible();
        // Check if playing? - maybe just visible for now
    }

    async waitForGameOverlay() {
        await expect(this.gameOverlay).toBeVisible({ timeout: 15000 }); // Wait for interrupt
    }

    async playRound(swipes: number = 1) {
        await this.waitForGameOverlay();
        for (let i = 0; i < swipes; i++) {
            await expect(this.cardWord).toBeVisible();
            // Swipe Right (Know it)
            await this.swipeRightButton.click();
            // Small delay to allow animation/transition if needed
            await this.page.waitForTimeout(500);
        }
        // Expect overlay to disappear if finished?
        // await expect(this.gameOverlay).not.toBeVisible();
    }
}
