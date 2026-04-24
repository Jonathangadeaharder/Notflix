import { describe, expect, it } from "vitest";
import {
  computeComprehensionPercent,
  getDashboardStatusLabel,
  isContinueWatching,
  pickFeaturedVideo,
  type DashboardVideo,
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

function makeVideo(
  overrides: Partial<DashboardVideo> & { id: string },
): DashboardVideo {
  return {
    title: "Test",
    thumbnailPath: "/thumb.jpg",
    createdAt: new Date(),
    views: 0,
    targetLang: "es",
    status: "COMPLETED",
    statusLabel: "Ready",
    progressStage: "READY",
    processingPercent: 100,
    watchPercent: 0,
    watchSeconds: 0,
    watchDuration: 0,
    comprehensionPercent: null,
    ...overrides,
  };
}

describe("isContinueWatching", () => {
  it("WhenCompletedWithPartialProgress_ThenIsContinueWatching", () => {
    expect(isContinueWatching(makeVideo({ id: "1", watchPercent: 50 }))).toBe(
      true,
    );
  });

  it("WhenCompletedWithZeroProgress_ThenNotContinueWatching", () => {
    expect(isContinueWatching(makeVideo({ id: "1", watchPercent: 0 }))).toBe(
      false,
    );
  });

  it("WhenCompletedWithFullProgress_ThenNotContinueWatching", () => {
    expect(
      isContinueWatching(makeVideo({ id: "1", watchPercent: FULL_WATCH })),
    ).toBe(false);
  });

  it("WhenPendingWithPartialProgress_ThenNotContinueWatching", () => {
    expect(
      isContinueWatching(
        makeVideo({ id: "1", status: "PENDING", watchPercent: 50 }),
      ),
    ).toBe(false);
  });
});

describe("pickFeaturedVideo", () => {
  it("prefers continue watching over first completed", () => {
    const videos = [
      makeVideo({ id: "done", watchPercent: FULL_WATCH }),
      makeVideo({ id: "cw", watchPercent: PARTIAL_WATCH_PERCENT }),
    ];
    const result = pickFeaturedVideo(videos);
    expect(result.continueWatching?.id).toBe("cw");
    expect(result.featuredVideo?.id).toBe("cw");
  });

  it("picks first completed when no continue watching", () => {
    const videos = [
      makeVideo({ id: "pending", status: "PENDING", watchPercent: 0 }),
      makeVideo({ id: "done", watchPercent: FULL_WATCH }),
    ];
    const result = pickFeaturedVideo(videos);
    expect(result.continueWatching).toBeNull();
    expect(result.featuredVideo?.id).toBe("done");
  });

  it("picks first video when none completed", () => {
    const videos = [
      makeVideo({ id: "first", status: "PENDING", watchPercent: 0 }),
      makeVideo({ id: "second", status: "PENDING", watchPercent: 0 }),
    ];
    const result = pickFeaturedVideo(videos);
    expect(result.featuredVideo?.id).toBe("first");
    expect(result.continueWatching).toBeNull();
  });

  it("returns null for empty list", () => {
    const result = pickFeaturedVideo([]);
    expect(result.featuredVideo).toBeNull();
    expect(result.continueWatching).toBeNull();
  });
});
