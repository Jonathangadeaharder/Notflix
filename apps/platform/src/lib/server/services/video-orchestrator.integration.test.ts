import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { db } from "../infrastructure/database";
import { video, videoProcessing } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { processVideo } from "./video-pipeline";

// Mock the AI gateway used inside processVideo
vi.mock("../adapters/real-ai-gateway", () => ({
  RealAiGateway: vi.fn().mockImplementation(function (this: any) {
    this.generateThumbnail = vi
      .fn()
      .mockResolvedValue({ thumbnail_path: "thumb.jpg" });
    this.transcribe = vi.fn().mockResolvedValue({
      language: "es",
      language_probability: 0.99,
      segments: [{ start: 0, end: 1, text: "Hola mundo" }],
    });
    this.transcribeWithProgress = vi
      .fn()
      .mockImplementation(async (_filePath, _lang, onProgress) => {
        if (onProgress) await onProgress(50);
        return {
          language: "es",
          language_probability: 0.99,
          segments: [{ start: 0, end: 1, text: "Hola mundo" }],
        };
      });
    this.analyzeBatch = vi.fn().mockResolvedValue({
      results: [[{ text: "Hola", lemma: "hola", pos: "INTJ", is_stop: false }]],
    });
    this.translate = vi
      .fn()
      .mockResolvedValue({ translations: ["Hello world"] });
  }),
}));

// Mock SmartFilter to avoid real DB knowledge lookups
vi.mock("./linguistic-filter.service", () => ({
  SmartFilter: vi.fn().mockImplementation(function (this: any) {
    this.filterBatch = vi.fn().mockResolvedValue([
      {
        classification: "LEARNING",
        tokens: [
          {
            text: "Hola",
            lemma: "hola",
            pos: "INTJ",
            is_stop: false,
            isKnown: false,
          },
        ],
      },
    ]);
  }),
}));

describe("Video Pipeline Integration", () => {
  const testVideoId = crypto.randomUUID();
  const testFilePath = "/app/media/test_vid.mp4";

  beforeAll(async () => {
    await db.insert(video).values({
      id: testVideoId,
      title: "Pipeline Integration Test Video",
      filePath: testFilePath,
    });
  });

  afterAll(async () => {
    await db
      .delete(videoProcessing)
      .where(eq(videoProcessing.videoId, testVideoId));
    await db.delete(video).where(eq(video.id, testVideoId));
  });

  it("should process a video through the full pipeline and persist results", async () => {
    await processVideo({
      videoId: testVideoId,
      targetLang: "es",
      nativeLang: "en",
      userId: "test-user-id",
      db,
    });

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
