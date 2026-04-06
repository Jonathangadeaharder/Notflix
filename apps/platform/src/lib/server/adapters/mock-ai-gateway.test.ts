import { describe, it, expect } from "vitest";
import { MockAiGateway } from "./mock-ai-gateway";

const EXPECTED_SEGMENTS = 2;
const EXPECTED_CONFIDENCE = 1.0;

describe("MockAiGateway", () => {
  const gateway = new MockAiGateway();

  it("returns mock transcription segments", async () => {
    const result = await gateway.transcribe("/fake/path.mp3");
    expect(result.segments).toHaveLength(EXPECTED_SEGMENTS);
    expect(result.language).toBe("en");
    expect(result.language_probability).toBe(EXPECTED_CONFIDENCE);
  });

  it("returns token analysis for each input text", async () => {
    const result = await gateway.analyzeBatch(["hello", "world"]);
    expect(result.results).toHaveLength(EXPECTED_SEGMENTS);
    expect(result.results[0][0]).toMatchObject({
      text: "Mock",
      lemma: "mock",
      pos: "NOUN",
      is_stop: false,
    });
  });

  it("returns translations prefixed with target language", async () => {
    const result = await gateway.translate(["gato", "perro"], "es", "en");
    expect(result.translations).toEqual(["[en] gato", "[en] perro"]);
  });

  it("returns a mock thumbnail path", async () => {
    const result = await gateway.generateThumbnail("/fake/video.mp4");
    expect(result.thumbnail_path).toBe("thumbnails/mock_thumb.jpg");
  });
});
