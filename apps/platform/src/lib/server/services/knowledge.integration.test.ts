import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../infrastructure/database";
import { user, knownWords } from "@notflix/database";
import { eq } from "drizzle-orm";
import { getKnownLemmas } from "./knowledge.service";

describe("KnowledgeService Integration (Real DB)", () => {
  const testUserId = crypto.randomUUID();
  const testTargetLang = "es";

  beforeAll(async () => {
    // 1. Create User
    await db.insert(user).values({
      id: testUserId,
      name: "Knowledge Test User",
      email: `knowledge-${testUserId}@example.com`,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      targetLang: testTargetLang,
      nativeLang: "en",
    });
  });

  afterAll(async () => {
    await db.delete(knownWords).where(eq(knownWords.userId, testUserId));
    await db.delete(user).where(eq(user.id, testUserId));
  });

  it("should initially have no known words for the test lemma", async () => {
    const lemmasToCheck = ["perro"];
    const known = await getKnownLemmas(
      testUserId,
      testTargetLang,
      lemmasToCheck,
      db,
    );
    expect(known.has("perro")).toBe(false);
  });

  it("should retrieve word after marking it as known", async () => {
    // Simulate API write (only required fields per schema)
    await db.insert(knownWords).values({
      userId: testUserId,
      lang: testTargetLang,
      lemma: "perro",
    });

    // Verify Read
    const lemmasToCheck = ["perro", "gato"];
    const known = await getKnownLemmas(
      testUserId,
      testTargetLang,
      lemmasToCheck,
      db,
    );

    expect(known.has("perro")).toBe(true);
    expect(known.has("gato")).toBe(false); // Still unknown
  });
});
