import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../infrastructure/database";
import { video, videoProcessing, user, knownWords } from "@notflix/database";
import { eq } from "drizzle-orm";
import { generateDeck } from "./chunker.service";
import type { VttSegment } from "./video-orchestrator.service";

const testUserId = crypto.randomUUID();
const testVideoId = crypto.randomUUID();
const testTargetLang = "es";
const mediaRoot = path.join(process.cwd(), "media", "fixtures");
const testVideoPath = path.join(mediaRoot, "chunker_test.mp4");
const testThumbnailPath = path.join(mediaRoot, "chunker_thumb.jpg");
const FIRST_CHUNK_START = 0;
const FIRST_CHUNK_END = 5;
const EXPECTED_DECK_SIZE = 2;
const OUT_OF_RANGE_START = 100;
const OUT_OF_RANGE_END = 105;

beforeAll(async () => {
  await db.insert(user).values({
    id: testUserId,
    name: "Integration Test User",
    email: `test-${testUserId}@example.com`,
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(video).values({
    id: testVideoId,
    title: "Chunker Integration Video",
    filePath: testVideoPath,
    thumbnailPath: testThumbnailPath,
    views: 0,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const vttData: VttSegment[] = [
    {
      start: 0,
      end: 5,
      text: "El gato se sienta.",
      tokens: [
        { text: "El", lemma: "el", pos: "DET", is_stop: true },
        { text: "gato", lemma: "gato", pos: "NOUN", is_stop: false },
        { text: "se", lemma: "se", pos: "PRON", is_stop: true },
        { text: "sienta", lemma: "sentar", pos: "VERB", is_stop: false },
      ],
    },
  ];

  await db.insert(videoProcessing).values({
    videoId: testVideoId,
    targetLang: testTargetLang,
    status: "COMPLETED",
    vttJson: vttData,
  });

  await db.insert(knownWords).values({
    userId: testUserId,
    lang: testTargetLang,
    lemma: "sentar",
  });
});

afterAll(async () => {
  await db.delete(knownWords).where(eq(knownWords.userId, testUserId));
  await db
    .delete(videoProcessing)
    .where(eq(videoProcessing.videoId, testVideoId));
  await db.delete(video).where(eq(video.id, testVideoId));
  await db.delete(user).where(eq(user.id, testUserId));
});

describe("ChunkerService Integration (Real DB)", () => {
  it("should generate a deck from real DB data with correct known status", async () => {
    // ACT
    // Request chunk 0-5s
    const deck = await generateDeck(
      testUserId,
      testVideoId,
      FIRST_CHUNK_START,
      FIRST_CHUNK_END,
      testTargetLang,
    );

    // ASSERT
    // Should contain 'gato' (NOUN) and 'sentar' (VERB)
    // 'el' and 'se' are stop words/not CONTENT_POS
    expect(deck).toHaveLength(EXPECTED_DECK_SIZE);

    const gatoCard = deck.find((c) => c.lemma === "gato");
    const sentarCard = deck.find((c) => c.lemma === "sentar");

    expect(gatoCard).toBeDefined();
    expect(gatoCard?.isKnown).toBe(false); // Unknown

    expect(sentarCard).toBeDefined();
    expect(sentarCard?.isKnown).toBe(true); // Known via DB
    expect(sentarCard?.original).toBe("sienta");
    expect(sentarCard?.contextSentence).toBe("El gato se sienta."); // Context check
  });

  it("should return empty deck for out-of-range chunk", async () => {
    const deck = await generateDeck(
      testUserId,
      testVideoId,
      OUT_OF_RANGE_START,
      OUT_OF_RANGE_END,
      testTargetLang,
    );
    expect(deck).toEqual([]);
  });
});
