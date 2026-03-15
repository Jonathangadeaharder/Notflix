import { describe, expect, it } from "vitest";
import {
  computeComprehensionPercent,
  getDashboardStatusLabel,
} from "./dashboard-metrics";

const EXPECTED_COMPREHENSION_PERCENT = 67;
const PARTIAL_WATCH_PERCENT = 45;

describe("dashboard-metrics", () => {
  it("computes a weighted comprehension percentage from segment difficulty", () => {
    expect(
      computeComprehensionPercent([
        { start: 0, end: 1, text: "Hola", tokens: [], classification: "EASY" },
        {
          start: 1,
          end: 2,
          text: "mundo",
          tokens: [],
          classification: "LEARNING",
        },
        {
          start: 2,
          end: 3,
          text: "dificil",
          tokens: [],
          classification: "HARD",
        },
      ]),
    ).toBe(EXPECTED_COMPREHENSION_PERCENT);
  });

  it("labels completed partially watched videos as continue watching", () => {
    expect(getDashboardStatusLabel("COMPLETED", PARTIAL_WATCH_PERCENT)).toBe(
      "Continue Watching",
    );
  });
});
