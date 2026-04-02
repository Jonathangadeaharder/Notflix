import { describe, expect, it } from "vitest";
import {
  computeComprehensionPercent,
  getDashboardStatusLabel,
} from "./dashboard-metrics";

const EXPECTED_COMPREHENSION_PERCENT = 67;
const LEARNING_PERCENT = 70;
const PARTIAL_WATCH_PERCENT = 45;
const ZERO_WATCH = 0;
const FULL_WATCH = 100;

describe("computeComprehensionPercent", () => {
  it("computes a weighted percentage from segment difficulty", () => {
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

  it("returns null for null input", () => {
    expect(computeComprehensionPercent(null)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(computeComprehensionPercent([])).toBeNull();
  });

  it("falls back to LEARNING weight when classification is missing", () => {
    expect(
      computeComprehensionPercent([
        { start: 0, end: 1, text: "test", tokens: [] },
      ]),
    ).toBe(LEARNING_PERCENT);
  });

  it("falls back to LEARNING weight for unknown classification", () => {
    expect(
      computeComprehensionPercent([
        {
          start: 0,
          end: 1,
          text: "test",
          tokens: [],
          classification: "UNKNOWN",
        },
      ]),
    ).toBe(LEARNING_PERCENT);
  });
});

describe("getDashboardStatusLabel", () => {
  it("labels completed partially watched as continue watching", () => {
    expect(getDashboardStatusLabel("COMPLETED", PARTIAL_WATCH_PERCENT)).toBe(
      "Continue Watching",
    );
  });

  it("labels ERROR status as needs attention", () => {
    expect(getDashboardStatusLabel("ERROR", ZERO_WATCH)).toBe(
      "Needs Attention",
    );
  });

  it("labels non-completed status as processing", () => {
    expect(getDashboardStatusLabel("PENDING", ZERO_WATCH)).toBe("Processing");
    expect(getDashboardStatusLabel(null, ZERO_WATCH)).toBe("Processing");
  });

  it("labels completed unwatched as ready", () => {
    expect(getDashboardStatusLabel("COMPLETED", ZERO_WATCH)).toBe("Ready");
  });

  it("labels completed fully watched as ready", () => {
    expect(getDashboardStatusLabel("COMPLETED", FULL_WATCH)).toBe("Ready");
  });
});
