import { test, expect } from "@playwright/test";

const TEST_EMAIL = `e2e-auth-${Date.now()}@test.local`;
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test-only credential
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "E2E Auth Test";

test.describe("Auth Flow: Register → Login → Logout → Login", () => {
  test("should complete full auth cycle", async ({ page }) => {
    test.setTimeout(120_000);

    page.on("console", (msg) => {
      if (msg.type() === "error") console.error(`[Browser] ${msg.text()}`);
    });

    // ─── Step 1: Register a new account ───
    await page.goto("/register");
    await expect(page.locator("h2, [data-slot='card-title']")).toContainText(
      "Create Account",
    );

    await page.locator("input#name").fill(TEST_NAME);
    await page.locator("input#email").fill(TEST_EMAIL);
    await page.locator("input#password").fill(TEST_PASSWORD);
    await page.locator("input#confirmPassword").fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // signUpEmail auto-signs-in and navigates to "/"
    await page.waitForURL("/", { timeout: 30_000 });

    // ─── Step 2: Verify we are logged in (logout button visible) ───
    await expect(page.locator('[data-testid="logout-btn"]')).toBeVisible({
      timeout: 10_000,
    });

    // ─── Step 3: Logout ───
    await page.locator('[data-testid="logout-btn"]').click();

    // After signOut, Supabase clears cookies and navigates to "/"
    await page.waitForTimeout(2000);

    // ─── Step 4: Navigate to login page and log in again ───
    await page.goto("/login");
    await expect(page.locator("h2, [data-slot='card-title']")).toContainText(
      "Welcome Back",
    );

    await page.locator("input#email").fill(TEST_EMAIL);
    await page.locator("input#password").fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Should be redirected to home
    await page.waitForURL("/", { timeout: 30_000 });

    // ─── Step 5: Verify logged in again ───
    await expect(page.locator('[data-testid="logout-btn"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
