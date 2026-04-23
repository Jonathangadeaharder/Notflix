/**
 * E2E Seed Script — Playwright globalSetup
 *
 * Inserts deterministic test data into Postgres before e2e tests run.
 * Uses direct postgres + drizzle-orm (no SvelteKit aliases).
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray, and } from "drizzle-orm";
import {
  user,
  video,
  videoProcessing,
  vocabReference,
  knownWords,
  watchProgress,
} from "../../src/lib/server/db/schema";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";

// ─── Fixed E2E UUIDs ───
export const E2E_USER_ID = "00000000-e2e0-4000-a000-000000000000";
export const E2E_VIDEO_1 = "00000000-e2e0-4000-b000-000000000001"; // COMPLETED
export const E2E_VIDEO_2 = "00000000-e2e0-4000-b000-000000000002"; // PENDING
export const E2E_VIDEO_3 = "00000000-e2e0-4000-b000-000000000003"; // No processing

const E2E_VIDEO_IDS = [E2E_VIDEO_1, E2E_VIDEO_2, E2E_VIDEO_3];

// ─── VTT JSON for the COMPLETED video ───
const VTT_JSON = [
  {
    start: 0,
    end: 2,
    text: "Hola mundo",
    tokens: [
      { text: "Hola", lemma: "hola", pos: "INTJ", is_stop: false, whitespace: " ", translation: "Hello" },
      { text: "mundo", lemma: "mundo", pos: "NOUN", is_stop: false, whitespace: "", translation: "world" },
    ],
    classification: "LEARNING",
    translation: "Hello world",
  },
  {
    start: 2,
    end: 4,
    text: "Cómo estás",
    tokens: [
      { text: "Cómo", lemma: "cómo", pos: "ADV", is_stop: true, whitespace: " " },
      { text: "estás", lemma: "estar", pos: "VERB", is_stop: false, whitespace: "", translation: "are" },
    ],
    classification: "EASY",
    translation: "How are you",
  },
  {
    start: 4,
    end: 6,
    text: "Muy bien gracias",
    tokens: [
      { text: "Muy", lemma: "muy", pos: "ADV", is_stop: true, whitespace: " " },
      { text: "bien", lemma: "bien", pos: "ADV", is_stop: false, whitespace: " ", translation: "well" },
      { text: "gracias", lemma: "gracia", pos: "NOUN", is_stop: false, whitespace: "", translation: "thanks" },
    ],
    classification: "LEARNING",
    translation: "Very well thanks",
  },
];

// ─── Vocab reference seed data ───
const VOCAB_SEED = [
  { lemma: "hola", lang: "es", level: "A1" as const },
  { lemma: "mundo", lang: "es", level: "A1" as const },
  { lemma: "casa", lang: "es", level: "A1" as const },
  { lemma: "agua", lang: "es", level: "A1" as const },
  { lemma: "comer", lang: "es", level: "A1" as const },
  { lemma: "hablar", lang: "es", level: "A2" as const },
  { lemma: "trabajo", lang: "es", level: "A2" as const },
  { lemma: "familia", lang: "es", level: "A2" as const },
  { lemma: "ciudad", lang: "es", level: "A2" as const },
  { lemma: "entender", lang: "es", level: "B1" as const },
  { lemma: "desarrollar", lang: "es", level: "B1" as const },
  { lemma: "experiencia", lang: "es", level: "B1" as const },
  { lemma: "conseguir", lang: "es", level: "B2" as const },
  { lemma: "destacar", lang: "es", level: "B2" as const },
  { lemma: "imprescindible", lang: "es", level: "C1" as const },
  { lemma: "desempeñar", lang: "es", level: "C1" as const },
  { lemma: "efímero", lang: "es", level: "C2" as const },
  { lemma: "ineludible", lang: "es", level: "C2" as const },
  { lemma: "gracia", lang: "es", level: "A2" as const },
  { lemma: "estar", lang: "es", level: "A1" as const },
];

// ─── Known words for E2E user ───
const KNOWN_WORDS_SEED = [
  { userId: E2E_USER_ID, lemma: "hola", lang: "es", level: "A1" as const },
  { userId: E2E_USER_ID, lemma: "mundo", lang: "es", level: "A1" as const },
  { userId: E2E_USER_ID, lemma: "casa", lang: "es", level: "A1" as const },
  { userId: E2E_USER_ID, lemma: "agua", lang: "es", level: "A1" as const },
  { userId: E2E_USER_ID, lemma: "comer", lang: "es", level: "A1" as const },
];

export default async function globalSetup() {
  const databaseUrl =
    process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "E2E_DATABASE_URL or DATABASE_URL must be set for Playwright globalSetup",
    );
  }

  console.log("[E2E Seed] Connecting to database...");
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // ─── Clean up any leftover E2E data (idempotent) ───
    console.log("[E2E Seed] Cleaning up previous E2E data...");
    await db.delete(knownWords).where(eq(knownWords.userId, E2E_USER_ID));
    await db.delete(watchProgress).where(eq(watchProgress.userId, E2E_USER_ID));
    await db
      .delete(videoProcessing)
      .where(inArray(videoProcessing.videoId, E2E_VIDEO_IDS));
    await db.delete(video).where(inArray(video.id, E2E_VIDEO_IDS));
    // Only delete vocab we seeded (by lemma+lang)
    for (const v of VOCAB_SEED) {
      await db
        .delete(vocabReference)
        .where(and(eq(vocabReference.lemma, v.lemma), eq(vocabReference.lang, v.lang)));
    }

    // ─── Copy test video to media path ───
    const mediaRoot =
      process.env.MEDIA_ROOT_INTERNAL || resolve(process.cwd(), "../../media/uploads");
    const videoFilePath = `${mediaRoot}/e2e-test-video.webm`;
    const sourceVideoPath = resolve(process.cwd(), "static/test-video.webm");

    if (existsSync(sourceVideoPath)) {
      mkdirSync(dirname(videoFilePath), { recursive: true });
      copyFileSync(sourceVideoPath, videoFilePath);
      console.log(`[E2E Seed] Copied test video to ${videoFilePath}`);
    } else {
      throw new Error(
        `[E2E Seed] Required test video not found at ${sourceVideoPath}`,
      );
    }

    // ─── Insert videos ───
    console.log("[E2E Seed] Inserting test videos...");
    const now = new Date();
    await db.insert(video).values([
      {
        id: E2E_VIDEO_1,
        title: "E2E Completed Video",
        filePath: videoFilePath,
        thumbnailPath: null,
        duration: 6,
        createdAt: now,
        updatedAt: now,
        views: 0,
        published: false,
      },
      {
        id: E2E_VIDEO_2,
        title: "E2E Pending Video",
        filePath: videoFilePath,
        thumbnailPath: null,
        duration: null,
        createdAt: now,
        updatedAt: now,
        views: 0,
        published: false,
      },
      {
        id: E2E_VIDEO_3,
        title: "E2E Unprocessed Video",
        filePath: videoFilePath,
        thumbnailPath: null,
        duration: null,
        createdAt: now,
        updatedAt: now,
        views: 0,
        published: false,
      },
    ]);

    // ─── Insert processing records ───
    console.log("[E2E Seed] Inserting processing records...");
    await db.insert(videoProcessing).values([
      {
        videoId: E2E_VIDEO_1,
        targetLang: "es",
        status: "COMPLETED",
        progressStage: "READY",
        progressPercent: 100,
        vttJson: VTT_JSON,
        createdAt: now,
      },
      {
        videoId: E2E_VIDEO_2,
        targetLang: "es",
        status: "PENDING",
        progressStage: "QUEUED",
        progressPercent: 0,
        vttJson: null,
        createdAt: now,
      },
    ]);

    // ─── Insert vocab reference ───
    console.log("[E2E Seed] Inserting vocabulary reference data...");
    await db.insert(vocabReference).values(VOCAB_SEED).onConflictDoNothing();

    // ─── Ensure E2E user exists (needed for FK on known_words / watch_progress) ───
    console.log("[E2E Seed] Ensuring E2E user exists...");
    await db
      .insert(user)
      .values({
        id: E2E_USER_ID,
        name: "E2E Test User",
        email: "e2e@test.local",
        emailVerified: true,
        nativeLang: "en",
        targetLang: "es",
        gameIntervalMinutes: 10,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // ─── Insert known words for E2E user ───
    console.log("[E2E Seed] Inserting known words...");
    await db.insert(knownWords).values(KNOWN_WORDS_SEED).onConflictDoNothing();

    // ─── Insert watch progress ───
    console.log("[E2E Seed] Inserting watch progress...");
    await db
      .insert(watchProgress)
      .values({
        userId: E2E_USER_ID,
        videoId: E2E_VIDEO_1,
        currentTime: 3,
        duration: 6,
        progressPercent: 50,
        updatedAt: now,
      })
      .onConflictDoNothing();

    console.log("[E2E Seed] ✓ Seed data inserted successfully");
  } catch (error) {
    console.error("[E2E Seed] ✗ Failed to seed data:", error);
    throw error;
  } finally {
    await client.end();
  }
}
