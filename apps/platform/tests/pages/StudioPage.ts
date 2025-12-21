import { type Page, type Locator, expect } from '@playwright/test';

export class StudioPage {
    readonly page: Page;
    readonly uploadLink: Locator;
    readonly videoList: Locator;

    constructor(page: Page) {
        this.page = page;
        this.uploadLink = page.getByTestId('upload-link');
        this.videoList = page.getByTestId('video-item');
    }

    async goto() {
        await this.page.goto('/studio');
    }

    async clickUpload() {
        await this.uploadLink.click();
    }

    async getVideoStatusBadge(title: string) {
        // Find the specific card by title and get the first status-badge
        const videoCard = this.page.locator(`[data-testid="video-item"]`, { hasText: title });
        return videoCard.locator('[data-testid="status-badge"]').first();
    }

    async waitForVideoStatus(title: string, expectedStatus: string, timeout = 60000) {
        const badge = await this.getVideoStatusBadge(title);
        
        // Use Playwright's built-in polling without manual reload
        // Since the UI now has interval polling with invalidate('app:videos')
        await expect(badge).toHaveText(expectedStatus, { timeout });
    }
}