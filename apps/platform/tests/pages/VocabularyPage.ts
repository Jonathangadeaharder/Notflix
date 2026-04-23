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
    await Promise.all([
      this.page.waitForURL((url) =>
        url.pathname === "/vocabulary" && url.searchParams.get("search") === term,
      ),
      this.searchButton.click(),
    ]);
  }

  async clearSearch() {
    await this.clearSearchButton.click();
    await this.page.waitForURL((url) =>
      url.pathname === "/vocabulary" && !url.searchParams.has("search"),
    );
  }

  async filterByLevel(level: string) {
    const badge = this.page
      .locator("button", { hasText: new RegExp(`^${level}\\b`) })
      .first();
    await Promise.all([
      this.page.waitForURL((url) =>
        url.pathname === "/vocabulary" && url.searchParams.get("level") === level,
      ),
      badge.click(),
    ]);
  }

  async getVisibleWordTexts(): Promise<string[]> {
    const wordSpans = this.page.locator(
      "div.divide-y > div span.font-medium",
    );
    const texts = await wordSpans.allTextContents();
    return texts.map((t) => t.trim()).filter(Boolean);
  }

  readonly toggleKnownButton = (lemma: string): Locator =>
    this.page.getByTestId(`toggle-known-${lemma}`);

  async toggleKnown(lemma: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((response) =>
        response.url().includes("/api/words/known") &&
        ["POST", "DELETE"].includes(response.request().method()),
      ),
      this.toggleKnownButton(lemma).click(),
    ]);
  }

  async isWordKnown(lemma: string): Promise<boolean> {
    const btn = this.toggleKnownButton(lemma);
    const text = (await btn.textContent())?.trim() ?? "";
    return text.startsWith("Known");
  }
}
