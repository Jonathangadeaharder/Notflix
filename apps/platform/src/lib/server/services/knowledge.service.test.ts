import { describe, it, expect, vi } from "vitest";
import { getKnownLemmas } from "./knowledge.service";

// Mock the database import entirely
vi.mock("../infrastructure/database", () => ({
  db: {},
}));

describe("getKnownLemmas", () => {
  const USER_ID = "user-1";
  const TARGET_LANG = "es";

  it("returns empty set for empty lemma list", async () => {
    const result = await getKnownLemmas(USER_ID, TARGET_LANG, []);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it("returns set of known lemmas from database", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ lemma: "gato" }, { lemma: "perro" }]),
    };

    const result = await getKnownLemmas(
      USER_ID,
      TARGET_LANG,
      ["gato", "perro", "casa"],
      mockDb as any,
    );
    expect(result).toBeInstanceOf(Set);
    expect(result.has("gato")).toBe(true);
    expect(result.has("perro")).toBe(true);
    expect(result.has("casa")).toBe(false);
  });

  it("deduplicates input lemmas", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ lemma: "gato" }]),
    };

    const result = await getKnownLemmas(
      USER_ID,
      TARGET_LANG,
      ["gato", "gato", "gato"],
      mockDb as any,
    );
    expect(result.size).toBe(1);
    expect(result.has("gato")).toBe(true);
  });
});
