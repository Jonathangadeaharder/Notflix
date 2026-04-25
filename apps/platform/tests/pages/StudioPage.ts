import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

const DEFAULT_WAIT_TIMEOUT = 60000;

export class StudioPage {
    readonly page: Page;
    readonly uploadButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.uploadButton = page.locator('a[href$="/studio/upload"]');
    }

    async goto() {
        await this.page.goto('/studio');
    }

    async clickUpload() {
        await this.uploadButton.click();
        await this.page.waitForURL('**/upload');
    }

    async waitForVideoStatus(title: string, status: string, timeout = DEFAULT_WAIT_TIMEOUT) {
        const row = this.page.locator(`[data-testid="video-item"]`, { hasText: title });
        await expect(row.locator(`[data-testid="status-${status}"]`)).toBeVisible({ timeout });
    }
}