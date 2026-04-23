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

    const originalValue = await profile.gameIntervalSelect.inputValue();

    await profile.setGameInterval("5");
    await profile.save();

    await profile.goto();
    const value = await profile.gameIntervalSelect.inputValue();
    expect(value).toBe("5");

    await profile.setGameInterval(originalValue);
    await profile.save();
  });
});
