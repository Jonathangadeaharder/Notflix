/* eslint-disable test-smells/assertion-roulette */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SmartFilter,
  SegmentClassification,
} from "./linguistic-filter.service";
import { db } from "../infrastructure/database";
import { LIMITS } from "$lib/constants";

vi.mock("../infrastructure/database", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  },
}));

describe("LinguisticFilterService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should classify a segment as EASY if all content words are known", async () => {
    // --- ARRANGE ---
    const mockedDb = db as unknown as {
      where: { mockResolvedValueOnce: (val: unknown) => void };
    };
    const mockTokens = [
      { text: "Hola", lemma: "hola", pos: "INTJ", is_stop: false },
      { text: "!", lemma: "!", pos: "PUNCT", is_stop: false },
    ];

    // Mock DB returns 'hola' as known
    mockedDb.where.mockResolvedValueOnce([{ lemma: "hola" }]);

    const filter = new SmartFilter(
      db as unknown as ConstructorParameters<typeof SmartFilter>[0],
    );

    // --- ACT ---
    const result = await filter.filterSegment(
      mockTokens as unknown as Parameters<typeof filter.filterSegment>[0],
      "u1",
      "es",
    );

    // --- ASSERT ---
    expect(result.classification).toBe(SegmentClassification.EASY);
    expect(result.unknownCount).toBe(0);
    expect(result.tokens[0].isKnown).toBe(true);
  });

  it("should classify a segment as LEARNING if there are few unknown words", async () => {
    // --- ARRANGE ---
    const mockedDb = db as unknown as {
      where: { mockResolvedValueOnce: (val: unknown) => void };
    };
    const mockTokens = [
      { text: "El", lemma: "el", pos: "DET", is_stop: true },
      { text: "gato", lemma: "gato", pos: "NOUN", is_stop: false }, // Unknown
      { text: "corre", lemma: "correr", pos: "VERB", is_stop: false }, // Known
      { text: "rápido", lemma: "rápido", pos: "ADV", is_stop: false }, // Known
      { text: "hoy", lemma: "hoy", pos: "ADV", is_stop: false }, // Known
    ];

    // Mock DB: correr, rápido, hoy are known
    mockedDb.where.mockResolvedValueOnce([
      { lemma: "correr" },
      { lemma: "rápido" },
      { lemma: "hoy" },
    ]);

    const filter = new SmartFilter(
      db as unknown as ConstructorParameters<typeof SmartFilter>[0],
    );

    // --- ACT ---
    const result = await filter.filterSegment(
      mockTokens as unknown as Parameters<typeof filter.filterSegment>[0],
      "u1",
      "es",
    );

    // --- ASSERT ---
    expect(result.classification).toBe(SegmentClassification.LEARNING);
    expect(result.unknownCount).toBe(1);
    expect(result.tokens.find((t) => t.lemma === "gato")?.isKnown).toBe(false);
  });

  it("should classify a segment as HARD if many words are unknown", async () => {
    // --- ARRANGE ---
    const mockedDb = db as unknown as {
      where: { mockResolvedValueOnce: (val: unknown) => void };
    };
    // 4 unknown content words
    const mockTokens = Array(LIMITS.HARD_UNKNOWN_THRESHOLD).fill({
      text: "Word",
      lemma: "w",
      pos: "NOUN",
      is_stop: false,
    });

    mockedDb.where.mockResolvedValueOnce([]); // Nothing known

    const filter = new SmartFilter(
      db as unknown as ConstructorParameters<typeof SmartFilter>[0],
    );

    // --- ACT ---
    const result = await filter.filterSegment(
      mockTokens as unknown as Parameters<typeof filter.filterSegment>[0],
      "u1",
      "es",
    );

    // --- ASSERT ---
    expect(result.classification).toBe(SegmentClassification.HARD);
    expect(result.unknownCount).toBe(LIMITS.HARD_UNKNOWN_THRESHOLD);
  });
});
