import { expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";

export class ProfilePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly gameIntervalSelect: Locator;
  readonly saveButton: Locator;
  readonly successIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1");
    this.gameIntervalSelect = page.locator("select#gameInterval");
    this.saveButton = page.locator('button[type="submit"]');
    this.successIndicator = page.locator("text=saved", { exact: false });
  }

  async goto() {
    await this.page.goto("/profile");
    await this.page.waitForLoadState("load");
  }

  async setGameInterval(value: string) {
    await this.gameIntervalSelect.selectOption(value);
  }

  async save() {
    await this.saveButton.click();
    await this.page.waitForLoadState("load");
  }

  async expectHeadingVisible() {
    await expect(this.heading).toContainText("Profile");
  }
}
