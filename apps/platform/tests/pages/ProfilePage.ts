import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly gameIntervalInput: Locator;
  readonly saveButton: Locator;
  readonly successIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.gameIntervalInput = page.locator('input[name="gameInterval"]');
    this.saveButton = page.locator('button[type="submit"]');
    this.successIndicator = page.locator('text=saved');
  }

  async goto() {
    await this.page.goto('/profile');
    await this.page.waitForLoadState('load');
  }

  async getGameInterval(): Promise<string> {
    return this.gameIntervalInput.inputValue();
  }

  async setGameInterval(value: string) {
    const label = value === '0' ? 'Off' : `${value} min`;
    const btn = this.page.getByRole('button', { name: label, exact: true });
    await btn.click();
  }

  async save() {
    await this.saveButton.click();
    await expect(this.successIndicator).toBeVisible();
  }

  async expectHeadingVisible() {
    await expect(this.heading).toContainText('Profile');
  }
}
