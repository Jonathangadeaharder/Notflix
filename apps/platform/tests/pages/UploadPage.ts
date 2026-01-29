import { type Page, type Locator } from "@playwright/test";

export class UploadPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByTestId("title-input");
    this.fileInput = page.getByTestId("file-input");
    this.submitButton = page.getByTestId("submit-button");
  }

  async uploadVideo(title: string, filePath: string) {
    await this.titleInput.fill(title);
    await this.fileInput.setInputFiles(filePath);
    await this.submitButton.click();
  }
}
