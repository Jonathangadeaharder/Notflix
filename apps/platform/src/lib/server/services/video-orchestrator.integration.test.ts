import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { db } from "../infrastructure/database";
import { video, videoProcessing } from "@notflix/database";
import { eq } from "drizzle-orm";
import { registerPipelineListeners } from "./video-pipeline";
import { globalEvents, EVENTS } from "../infrastructure/event-bus";
import { SmartFilter } from "./linguistic-filter.service";
import type { IAiGateway } from "../domain/interfaces";

// Mock AI Gateway to isolate testing of DB persistence logic
const mockAiGateway: IAiGateway = {
  generateThumbnail: vi.fn().mockResolvedValue({ thumbnail_path: "thumb.jpg" }),
  transcribe: vi.fn().mockResolvedValue({
    language: "es",
    language_probability: 0.99,
    segments: [{ start: 0, end: 1, text: "Hola mundo" }],
  }),
  transcribeWithProgress: vi
    .fn()
    .mockImplementation(async (filePath, lang, onProgress) => {
      if (onProgress) await onProgress(50);
      return {
        language: "es",
        language_probability: 0.99,
        segments: [{ start: 0, end: 1, text: "Hola mundo" }],
      };
    }),
  analyzeBatch: vi.fn().mockResolvedValue({
    results: [[{ text: "Hola", lemma: "hola", pos: "INTJ", is_stop: false }]],
  }),
  translate: vi.fn().mockResolvedValue({ translations: ["Hello world"] }),
};

describe("Video Pipeline Integration", () => {
  const testVideoId = crypto.randomUUID();
  const testFilePath = "/app/media/test_vid.mp4";

  beforeAll(async () => {
    // Register pipeline listeners with mocked dependencies
    registerPipelineListeners(db, mockAiGateway, new SmartFilter(db));
  });

  afterAll(async () => {
    // Cleanup
    await db
      .delete(videoProcessing)
      .where(eq(videoProcessing.videoId, testVideoId));
    await db.delete(video).where(eq(video.id, testVideoId));
    // Remove all listeners to avoid leaks between test runs
    globalEvents.removeAllListeners();
  });

  it("should process a video through the full pipeline and persist results", async () => {
    // 1. Arrange: Insert a video record
    console.log("DB URL USED BY DRIZZLE:", process.env.DATABASE_URL);
    await db.insert(video).values({
      id: testVideoId,
      title: "Pipeline Integration Test Video",
      filePath: testFilePath,
    });

    // 2. Act: Emit VIDEO_UPLOADED and wait for COMPLETED
    const completed = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Pipeline timed out")),
        10000,
      );
      globalEvents.on(
        EVENTS.PROCESSING_UPDATE,
        (data: { videoId: string; status: string }) => {
          if (data.videoId === testVideoId && data.status === "COMPLETED") {
            clearTimeout(timeout);
            resolve();
          }
        },
      );
    });

    globalEvents.emit(EVENTS.VIDEO_UPLOADED, {
      videoId: testVideoId,
      targetLang: "es",
      nativeLang: "en",
    });

    await completed;

    // 3. Assert: Check DB for results
    const processingRecord = await db
      .select()
      .from(videoProcessing)
      .where(eq(videoProcessing.videoId, testVideoId));

    expect(processingRecord).toHaveLength(1);
    expect(processingRecord[0].status).toBe("COMPLETED");
    expect(processingRecord[0].vttJson).toBeDefined();

    const segments = processingRecord[0].vttJson as Array<{ text: string }>;
    expect(segments[0].text).toBe("Hola mundo");
  });
});
