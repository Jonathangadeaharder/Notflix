import type { Page, Locator } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly heroSection: Locator;
  readonly trendingSection: Locator;
  readonly navLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroSection = page.locator("section").first();
    this.trendingSection = page.locator("text=Trending", { exact: false });
    this.navLinks = page.locator("nav a");
  }

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("load");
  }

  async getNavLinkTexts(): Promise<string[]> {
    const texts = await this.navLinks.allTextContents();
    return texts.map((t) => t.trim()).filter(Boolean);
  }
}
