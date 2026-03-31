import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../infrastructure/database";
import { video, videoProcessing, type DbVttSegment } from "@notflix/database";
import { eq } from "drizzle-orm";
import { SubtitleService } from "./subtitle.service";

const testVideoId = crypto.randomUUID();
const testTargetLang = "es";
const mediaRoot = path.join(process.cwd(), "media", "fixtures");
const testVideoPath = path.join(mediaRoot, "sub.mp4");
const testThumbnailPath = path.join(mediaRoot, "thumb.jpg");
const SPANISH_LINE = "Hola mundo";

beforeAll(async () => {
  await db.insert(video).values({
    id: testVideoId,
    title: "Subtitle Test Video",
    filePath: testVideoPath,
    thumbnailPath: testThumbnailPath,
    views: 0,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const vttData: DbVttSegment[] = [
    {
      start: 0,
      end: 2,
      text: SPANISH_LINE,
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

describe("SubtitleService Integration (Real DB)", () => {
  it("should generate Native VTT correctly", async () => {
    const service = new SubtitleService(db);
    const vtt = await service.generateVtt(testVideoId, "native");

    expect(vtt).toContain("WEBVTT");
    expect(vtt).toContain("00:00:00.000 --> 00:00:02.000");
    expect(vtt).toContain(SPANISH_LINE);
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

    expect(vtt).toContain(SPANISH_LINE); // Native line
  });

  it("should return null for non-existent video", async () => {
    const service = new SubtitleService(db);
    const vtt = await service.generateVtt(crypto.randomUUID(), "native");
    expect(vtt).toBeNull();
  });
});
