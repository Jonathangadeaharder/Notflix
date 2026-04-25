import { test, expect } from "@playwright/test";
import { ProfilePage } from "../pages/ProfilePage";

const PRESET_VALUES = ["0", "5", "10", "15", "20"];

test.describe("Profile: Settings", () => {
  test("displays current game interval", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    await profile.expectHeadingVisible();

    const value = await profile.getGameInterval();
    expect(PRESET_VALUES).toContain(value);
  });

  test("updates game interval", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.goto();

    const originalValue = await profile.getGameInterval();

    try {
      await profile.setGameInterval("5");
      await profile.save();

      await profile.goto();
      const value = await profile.getGameInterval();
      expect(value).toBe("5");
    } finally {
      if (PRESET_VALUES.includes(originalValue)) {
        await profile.setGameInterval(originalValue);
        await profile.save();
      }
    }
  });
});
