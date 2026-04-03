import { type Page, type Locator } from '@playwright/test';

export class UploadPage {
    readonly page: Page;
    readonly titleInput: Locator;
    readonly fileInput: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.titleInput = page.locator('input#title');
        this.fileInput = page.locator('input#file');
        this.submitButton = page.locator('button[type="submit"]').locator('text="Upload Video"');
    }

    async uploadVideo(title: string, filePath: string) {
        // Wait for full SvelteKit hydration before interacting
        await this.page.waitForLoadState('networkidle');
        await this.titleInput.waitFor({ state: 'visible' });
        await this.titleInput.fill(title);
        await this.fileInput.setInputFiles(filePath);
        await this.submitButton.click();
    }
}