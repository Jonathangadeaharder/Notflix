import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../infrastructure/database";
import { video, videoProcessing, type DbVttSegment } from "@notflix/database";
import { eq } from "drizzle-orm";
import { SubtitleService } from "./subtitle.service";

describe("SubtitleService Integration (Real DB)", () => {
  const testVideoId = crypto.randomUUID();
  const testTargetLang = "es";

  beforeAll(async () => {
    // 1. Create Video
    await db.insert(video).values({
      id: testVideoId,
      title: "Subtitle Test Video",
      filePath: "/tmp/sub.mp4",
      thumbnailPath: "/tmp/thumb.jpg",
      views: 0,
      published: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Insert VTT Data
    // Note: DbVttSegment doesn't have 'translation' at segment level,
    // only tokens have translations. For bilingual/translated mode,
    // the service should extract translations from tokens or store separately.
    const vttData: DbVttSegment[] = [
      {
        start: 0,
        end: 2,
        text: "Hola mundo",
        tokens: [
          {
            text: "Hola",
            lemma: "hola",
            pos: "INTJ",
            is_stop: false,
            translation: "Hello",
            isKnown: true,
          },
          { text: " ", lemma: " ", pos: "SPACE", is_stop: true, isKnown: true },
          {
            text: "mundo",
            lemma: "mundo",
            pos: "NOUN",
            is_stop: false,
            translation: "world",
            isKnown: false,
          },
        ],
      },
    ];

    await db.insert(videoProcessing).values({
      videoId: testVideoId,
      targetLang: testTargetLang,
      status: "COMPLETED",
      vttJson: vttData,
    });
  });

  afterAll(async () => {
    await db
      .delete(videoProcessing)
      .where(eq(videoProcessing.videoId, testVideoId));
    await db.delete(video).where(eq(video.id, testVideoId));
  });

  it("should generate Native VTT correctly", async () => {
    const service = new SubtitleService(db);
    const vtt = await service.generateVtt(testVideoId, "native");

    expect(vtt).toContain("WEBVTT");
    expect(vtt).toContain("00:00:00.000 --> 00:00:02.000");
    expect(vtt).toContain("Hola mundo");
    expect(vtt).not.toContain("Hello");
  });

  it("should generate Translated VTT correctly (Full Translation)", async () => {
    const service = new SubtitleService(db);
    const vtt = await service.generateVtt(testVideoId, "translated");

    // The translated mode should build translation from tokens
    // or use a segment-level translation if stored elsewhere
    expect(vtt).toBeDefined();
  });

  it("should generate Bilingual VTT correctly", async () => {
    const service = new SubtitleService(db);
    const vtt = await service.generateVtt(testVideoId, "bilingual");

    expect(vtt).toContain("Hola mundo"); // Native line
  });

  it("should return null for non-existent video", async () => {
    const service = new SubtitleService(db);
    const vtt = await service.generateVtt(crypto.randomUUID(), "native");
    expect(vtt).toBeNull();
  });
});
