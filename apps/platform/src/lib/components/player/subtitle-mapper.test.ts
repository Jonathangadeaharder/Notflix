import { describe, expect, it } from "vitest";
import { mapSegmentsToPlayerSubtitles } from "./subtitle-mapper";

describe("mapSegmentsToPlayerSubtitles", () => {
  it("maps segment learning state into interactive player subtitles", () => {
    const subtitles = mapSegmentsToPlayerSubtitles([
      {
        start: 0,
        end: 2,
        text: "Hola mundo",
        translation: "Hello world",
        classification: "LEARNING",
        tokens: [
          {
            text: "Hola",
            lemma: "hola",
            pos: "INTJ",
            is_stop: false,
            isKnown: false,
            translation: "Hello",
            whitespace: " ",
          },
          {
            text: "mundo",
            lemma: "mundo",
            pos: "NOUN",
            is_stop: false,
            isKnown: true,
            translation: "world",
          },
        ],
      },
    ]);

    expect(subtitles).toHaveLength(1);
    expect(subtitles[0].translation).toBe("Hello world");
    expect(subtitles[0].words?.[0].difficulty).toBe("learning");
    expect(subtitles[0].words?.[1].difficulty).toBe("easy");
    expect(subtitles[0].words?.[0].breakdown).toBe("INTJ • Unknown");
  });
});
