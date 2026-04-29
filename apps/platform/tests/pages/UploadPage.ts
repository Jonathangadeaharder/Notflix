import type { Locator, Page } from '@playwright/test';

export class UploadPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.locator('input#title');
    this.fileInput = page.locator('input#file');
    this.submitButton = page
      .locator('button[type="submit"]')
      .locator('text="Upload Video"');
  }

  async uploadVideo(title: string, filePath: string) {
    // Wait for DOM to be parsed, then wait for the input to hydrate
    await this.page.waitForLoadState('domcontentloaded');
    await this.titleInput.waitFor({ state: 'visible' });
    await this.titleInput.fill(title);
    await this.fileInput.setInputFiles(filePath);
    await this.submitButton.click();
  }
}
