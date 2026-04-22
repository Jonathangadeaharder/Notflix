import type { Page, Locator } from "@playwright/test";

export class VocabularyPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly clearSearchButton: Locator;
  readonly wordRows: Locator;
  readonly heading: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly paginationText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder="Search words..."]');
    this.searchButton = page.getByRole("button", { name: "Search" });
    this.clearSearchButton = page.getByRole("button", { name: "Clear" });
    // Words are in a divide-y list, each row has a span.text-white.font-medium
    this.wordRows = page.locator(
      "div.divide-y > div",
    );
    this.heading = page.locator("h1");
    this.prevButton = page.getByRole("button", { name: /previous/i });
    this.nextButton = page.getByRole("button", { name: /next/i });
    this.paginationText = page.locator("text=/Page \\d+ of \\d+/");
  }

  async goto() {
    await this.page.goto("/vocabulary");
    await this.page.waitForLoadState("load");
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.page.waitForLoadState("load");
  }

  async clearSearch() {
    await this.clearSearchButton.click();
    await this.page.waitForLoadState("load");
  }

  async filterByLevel(level: string) {
    // Level buttons contain text like "A1 (Beginner) 646"
    const badge = this.page
      .locator("button", { hasText: new RegExp(`^${level}\\b`) })
      .first();
    await badge.click();
    await this.page.waitForLoadState("load");
  }

  async getVisibleWordTexts(): Promise<string[]> {
    const wordSpans = this.page.locator(
      "div.divide-y > div span.font-medium",
    );
    const texts = await wordSpans.allTextContents();
    return texts.map((t) => t.trim()).filter(Boolean);
  }
}
