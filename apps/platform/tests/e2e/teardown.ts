/**
 * E2E Teardown Script — Playwright globalTeardown
 *
 * Removes all E2E test data inserted by seed.ts.
 * Deletes in FK-safe order.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import {
  video,
  videoProcessing,
  knownWords,
  watchProgress,
} from "../../src/lib/server/db/schema";

const E2E_USER_ID = "00000000-e2e0-4000-a000-000000000000";
const E2E_VIDEO_IDS = [
  "00000000-e2e0-4000-b000-000000000001",
  "00000000-e2e0-4000-b000-000000000002",
  "00000000-e2e0-4000-b000-000000000003",
];

export default async function globalTeardown() {
  const databaseUrl =
    process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log(
      "[E2E Teardown] No database URL configured (E2E_DATABASE_URL or DATABASE_URL). Skipping teardown.",
    );
    return;
  }

  console.log("[E2E Teardown] Connecting to database...");
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Delete in FK-safe order (children before parents)
    await db.delete(knownWords).where(eq(knownWords.userId, E2E_USER_ID));
    await db.delete(watchProgress).where(eq(watchProgress.userId, E2E_USER_ID));
    await db
      .delete(videoProcessing)
      .where(inArray(videoProcessing.videoId, E2E_VIDEO_IDS));
    await db.delete(video).where(inArray(video.id, E2E_VIDEO_IDS));

    console.log("[E2E Teardown] ✓ Test data cleaned up successfully");
  } catch (error) {
    // Non-fatal — teardown failure shouldn't fail the test run
    console.error("[E2E Teardown] ✗ Cleanup failed (non-fatal):", error);
  } finally {
    await client.end();
  }
}
