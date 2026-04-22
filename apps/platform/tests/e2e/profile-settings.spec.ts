import { test, expect } from "@playwright/test";
import { ProfilePage } from "../pages/ProfilePage";

test.describe("Profile: Settings", () => {
  test("displays current game interval", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await profile.expectHeadingVisible();

    // The select should be visible and have a value
    await expect(profile.gameIntervalSelect).toBeVisible();
    const value = await profile.gameIntervalSelect.inputValue();
    expect(["0", "5", "10", "20"]).toContain(value);
  });

  test("updates game interval", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    // Change to "Every 5 Minutes"
    await profile.setGameInterval("5");
    await profile.save();

    // After save, the page reloads — verify the value persisted
    await profile.goto();
    const value = await profile.gameIntervalSelect.inputValue();
    expect(value).toBe("5");

    // Reset to original value to avoid test pollution
    await profile.setGameInterval("10");
    await profile.save();
  });
});
