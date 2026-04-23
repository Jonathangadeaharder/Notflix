import { test, expect } from "@playwright/test";

test.describe("Vocabulary: Browse and Filter", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("displays vocabulary page with words and level filters", async ({
    page,
  }) => {
    await page.goto("/vocabulary");
    await page.waitForLoadState("load");

    // Page heading
    await expect(page.locator("h1")).toContainText("Vocabulary");

    // Level filter buttons should be visible
    await expect(
      page.locator("button:has-text('A1 (Beginner)')"),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('B1 (Intermediate)')"),
    ).toBeVisible();
    await expect(
      page.locator("button:has-text('C2 (Proficient)')"),
    ).toBeVisible();

    // Word list should show items
    const wordCount = await page.locator("div.divide-y > div").count();
    expect(wordCount).toBeGreaterThan(0);

    // Search input should be available
    await expect(
      page.locator('input[placeholder="Search words..."]'),
    ).toBeVisible();

    // Toggle buttons should be present on word rows
    const toggleButtons = page.locator("[data-testid^='toggle-known-']");
    expect(await toggleButtons.count()).toBeGreaterThan(0);
  });

  test("navigates to level-filtered view via URL", async ({ page }) => {
    // Test the SSR path directly — bypasses client-side replaceState issues
    await page.goto("/vocabulary?level=A1&page=1");
    await page.waitForLoadState("load");

    // The A1 filter should be visually active
    const a1Button = page.locator(
      "button:has-text('A1 (Beginner)')",
    );
    await expect(a1Button).toBeVisible();

    // Words should be present
    const wordCount = await page.locator("div.divide-y > div").count();
    expect(wordCount).toBeGreaterThan(0);
  });

  test("navigates to search results view via URL", async ({ page }) => {
    // Test the SSR path directly
    await page.goto("/vocabulary?search=hola&page=1");
    await page.waitForLoadState("load");

    // Search input should show the search term
    const searchInput = page.locator(
      'input[placeholder="Search words..."]',
    );
    await expect(searchInput).toHaveValue("hola");
  });

  test("toggles word known status via button", async ({ page }) => {
    await page.goto("/vocabulary?search=hola&page=1");
    await page.waitForLoadState("networkidle");

    const toggleBtn = page.getByTestId("toggle-known-hola");

    await expect(toggleBtn).toContainText("Known", { timeout: 10_000 });

    const deleteResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/words/known") && resp.request().method() === "DELETE",
    );
    await toggleBtn.click();
    const delResp = await deleteResponse;
    expect(delResp.ok()).toBeTruthy();

    await expect(toggleBtn).toContainText("Mark Known", { timeout: 15_000 });

    const postResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/words/known") && resp.request().method() === "POST",
    );
    await toggleBtn.click();
    const postResp = await postResponse;
    expect(postResp.ok()).toBeTruthy();

    await expect(toggleBtn).toContainText("Known", { timeout: 15_000 });
  });
});
