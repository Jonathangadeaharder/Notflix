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
        console.log("WAITING FOR UPLOAD DOM:", await this.page.content());
        await this.titleInput.fill(title);
        await this.fileInput.setInputFiles(filePath);
        await this.submitButton.click();
    }
}