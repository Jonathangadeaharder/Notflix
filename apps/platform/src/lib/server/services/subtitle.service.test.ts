import { describe, it, expect, vi } from "vitest";
import { SubtitleService } from "./subtitle.service";

// Mock the database import
vi.mock("../infrastructure/database", () => ({
  db: {},
}));

const MOCK_START = 0;
const MOCK_END = 5;
const NATIVE_TEXT = "Hola mundo";
const TRANSLATED_TEXT = "Hello world";

// Mock subtitle-utils (they have their own test suite)
vi.mock("../utils/subtitle-utils", () => ({
  generateVtt: vi.fn((segments) => {
    const body = segments
      .map(
        (s: { start: string; end: string; text: string }) =>
          `${s.start} --> ${s.end}\n${s.text}`,
      )
      .join("\n\n");
    return `WEBVTT\n\n${body}`;
  }),
  secondsToSrtTime: vi.fn((s: number) => {
    const PAD_WIDTH = 2;
    const padded = Math.floor(s).toString().padStart(PAD_WIDTH, "0");
    return `00:00:${padded},000`;
  }),
}));

const MOCK_TOKEN_HOLA = {
  text: "Hola",
  lemma: "hola",
  pos: "INTJ",
  is_stop: false,
  translation: "Hello",
  whitespace: " ",
};
const MOCK_TOKEN_MUNDO = {
  text: "mundo",
  lemma: "mundo",
  pos: "NOUN",
  is_stop: false,
  translation: "world",
  whitespace: "",
};

const MOCK_VTT_SEGMENTS = [
  {
    start: MOCK_START,
    end: MOCK_END,
    text: NATIVE_TEXT,
    translation: TRANSLATED_TEXT,
    tokens: [MOCK_TOKEN_HOLA, MOCK_TOKEN_MUNDO],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockDb(records: unknown[]): any {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(records),
  };
}

describe("SubtitleService: no data", () => {
  it("returns null when no processing record exists", async () => {
    const service = new SubtitleService(createMockDb([]));
    await expect(service.generateVtt("missing-video")).resolves.toBeNull();
  });

  it("returns null when vttJson is null", async () => {
    const service = new SubtitleService(createMockDb([{ vttJson: null }]));
    await expect(service.generateVtt("video-1")).resolves.toBeNull();
  });
});

describe("SubtitleService: subtitle modes", () => {
  it("generates native mode subtitles", async () => {
    const service = new SubtitleService(
      createMockDb([{ vttJson: MOCK_VTT_SEGMENTS }]),
    );
    const result = await service.generateVtt("video-1", "native");
    expect(result).toContain(NATIVE_TEXT);
  });

  it("generates translated mode subtitles", async () => {
    const service = new SubtitleService(
      createMockDb([{ vttJson: MOCK_VTT_SEGMENTS }]),
    );
    const result = await service.generateVtt("video-1", "translated");
    expect(result).toContain(TRANSLATED_TEXT);
  });

  it("generates bilingual mode subtitles", async () => {
    const service = new SubtitleService(
      createMockDb([{ vttJson: MOCK_VTT_SEGMENTS }]),
    );
    const result = await service.generateVtt("video-1", "bilingual");
    expect(result).toContain(NATIVE_TEXT);
    expect(result).toContain(TRANSLATED_TEXT);
  });

  it("falls back to token reconstruction when translation is missing", async () => {
    const noTranslationSegments = [
      {
        start: MOCK_START,
        end: MOCK_END,
        text: NATIVE_TEXT,
        tokens: [
          { ...MOCK_TOKEN_HOLA },
          {
            text: "mundo",
            lemma: "mundo",
            pos: "NOUN",
            is_stop: false,
            whitespace: "",
          },
        ],
      },
    ];
    const service = new SubtitleService(
      createMockDb([{ vttJson: noTranslationSegments }]),
    );
    const result = await service.generateVtt("video-1", "translated");
    expect(result).toContain("Hello mundo");
  });
});
