import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../infrastructure/database";
import { user, knownWords } from "@notflix/database";
import { eq } from "drizzle-orm";
import {
  SmartFilter,
  SegmentClassification,
} from "./linguistic-filter.service";
import type { TokenAnalysis } from "../domain/interfaces";

const testUserId = crypto.randomUUID();
const testTargetLang = "es";

beforeAll(async () => {
  // 1. Create User
  await db.insert(user).values({
    id: testUserId,
    name: "Filter Integration User",
    email: `filter-${testUserId}@example.com`,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    targetLang: testTargetLang,
    nativeLang: "en",
  });

  // 2. Insert Known Words (only required fields per schema)
  await db.insert(knownWords).values([
    {
      userId: testUserId,
      lang: testTargetLang,
      lemma: "gato",
    },
    {
      userId: testUserId,
      lang: testTargetLang,
      lemma: "comer",
    },
  ]);
});

afterAll(async () => {
  await db.delete(knownWords).where(eq(knownWords.userId, testUserId));
  await db.delete(user).where(eq(user.id, testUserId));
});

describe("SmartFilter Integration (Real DB)", () => {
  it("classifies content as EASY when all content words are known", async () => {
    const filter = new SmartFilter(db);

    const tokens: TokenAnalysis[] = [
      { text: "El", lemma: "el", pos: "DET", is_stop: true },
      { text: "gato", lemma: "gato", pos: "NOUN", is_stop: false },
      { text: "come", lemma: "comer", pos: "VERB", is_stop: false },
      { text: ".", lemma: ".", pos: "PUNCT", is_stop: false },
    ];

    const result = await filter.filterSegment(
      tokens,
      testUserId,
      testTargetLang,
    );

    expect(result.classification).toBe(SegmentClassification.EASY);
    expect(result.unknownCount).toBe(0);

    expect(result.tokens[1].lemma).toBe("gato");
    expect(result.tokens[1].isKnown).toBe(true);
    expect(result.tokens[2].lemma).toBe("comer");
    expect(result.tokens[2].isKnown).toBe(true);
  });
});

describe("SmartFilter Integration (Unknown content)", () => {
  it("marks unknown words and does not treat them as known", async () => {
    const filter = new SmartFilter(db);

    const tokens: TokenAnalysis[] = [
      { text: "El", lemma: "el", pos: "DET", is_stop: true },
      { text: "perro", lemma: "perro", pos: "NOUN", is_stop: false },
      { text: "come", lemma: "comer", pos: "VERB", is_stop: false },
      { text: ".", lemma: ".", pos: "PUNCT", is_stop: false },
    ];

    const result = await filter.filterSegment(
      tokens,
      testUserId,
      testTargetLang,
    );

    expect(result.tokens.find((t) => t.lemma === "perro")?.isKnown).toBe(false);
    expect(result.tokens.find((t) => t.lemma === "comer")?.isKnown).toBe(true);
  });
});
