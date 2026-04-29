import type { Locator, Page } from '@playwright/test';

export class VocabularyPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly clearSearchButton: Locator;
  readonly heading: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly paginationText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder="Search lemmas…"]');
    this.searchButton = page.getByRole('button', {
      name: 'Search',
      exact: true,
    });
    this.clearSearchButton = page.getByRole('button', { name: 'Clear' });
    this.heading = page.locator('h1');
    this.prevButton = page.getByRole('button', { name: /previous/i });
    this.nextButton = page.getByRole('button', { name: /next/i });
    this.paginationText = page.locator('text=/Page \\d+ of \\d+/');
  }

  async goto() {
    await this.page.goto('/vocabulary');
    await this.page.waitForLoadState('load');
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await Promise.all([
      this.page.waitForURL(
        (url) =>
          url.pathname === '/vocabulary' &&
          url.searchParams.get('search') === term,
      ),
      this.searchButton.click(),
    ]);
  }

  async clearSearch() {
    await this.clearSearchButton.click();
    await this.page.waitForURL(
      (url) =>
        url.pathname === '/vocabulary' && !url.searchParams.has('search'),
    );
  }

  async filterByLevel(level: string) {
    const badge = this.page
      .getByRole('button', { name: new RegExp(level) })
      .first();
    await badge.waitFor({ state: 'visible', timeout: 10000 });
    await badge.click();
    await this.page.waitForURL(
      (url) =>
        url.pathname === '/vocabulary' &&
        url.searchParams.get('level') === level,
      { timeout: 10000 },
    );
  }

  async getVisibleWordTexts(): Promise<string[]> {
    const wordSpans = this.page.locator('span.font-semibold');
    const texts = await wordSpans.allTextContents();
    return texts.map((t) => t.trim()).filter(Boolean);
  }

  readonly toggleKnownButton = (lemma: string): Locator =>
    this.page.getByTestId(`toggle-known-${lemma}`);

  async toggleKnown(lemma: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url().includes('/api/words/known') &&
          ['POST', 'DELETE'].includes(response.request().method()),
      ),
      this.toggleKnownButton(lemma).click(),
    ]);
  }

  async isWordKnown(lemma: string): Promise<boolean> {
    const btn = this.toggleKnownButton(lemma);
    const text = (await btn.textContent())?.trim() ?? '';
    return (
      text === 'Known ✕' || (text.startsWith('Known') && !text.includes('Mark'))
    );
  }
}
