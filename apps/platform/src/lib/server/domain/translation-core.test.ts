import { describe, it, expect } from "vitest";
import {
  mapAnalysisToSegments,
  extractUnknownLemmas,
  extractUniqueLemmas,
  mapTranslationsToSegments,
} from "./translation-core";
import type {
  TranscriptionResponse,
  TokenAnalysis,
  VttSegment,
} from "$lib/types";

// --- Spec: functional-specs §3.2-3.4, database-schema.md (DbVttSegment/DbTokenAnalysis) ---

function makeToken(overrides: Partial<TokenAnalysis> = {}): TokenAnalysis {
  return {
    text: "gatos",
    lemma: "gato",
    pos: "NOUN",
    is_stop: false,
    ...overrides,
  };
}

function makeSegment(text: string, tokens: TokenAnalysis[] = []): VttSegment {
  return { start: 0, end: 5, text, tokens };
}

const TRANSCRIPTION: TranscriptionResponse = {
  language: "es",
  language_probability: 0.95,
  segments: [
    { start: 0, end: 5, text: "Los gatos beben leche" },
    { start: 5, end: 10, text: "El perro corre rápido" },
  ],
};

const BATCH_ANALYSIS = [
  [
    makeToken({ text: "Los", lemma: "el", pos: "DET", is_stop: true }),
    makeToken({ lemma: "gato" }),
    makeToken({ lemma: "beber" }),
    makeToken({ lemma: "leche" }),
  ],
  [
    makeToken({ text: "El", lemma: "el", pos: "DET", is_stop: true }),
    makeToken({ lemma: "perro" }),
    makeToken({ lemma: "correr" }),
    makeToken({ lemma: "rápido", pos: "ADV" }),
  ],
];

describe("mapAnalysisToSegments", () => {
  it("WhenMapAnalysisToSegments_ThenReturnsVttSegmentsWithTokens", () => {
    const result = mapAnalysisToSegments(TRANSCRIPTION, BATCH_ANALYSIS);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        start: 0,
        end: 5,
        text: "Los gatos beben leche",
        tokens: BATCH_ANALYSIS[0],
      }),
    );
  });

  it("WhenMapAnalysisToSegments_ThenPreservesSegmentOrder", () => {
    const result = mapAnalysisToSegments(TRANSCRIPTION, BATCH_ANALYSIS);
    expect(result[0].text).toBe("Los gatos beben leche");
    expect(result[1].text).toBe("El perro corre rápido");
  });
});

describe("extractUnknownLemmas", () => {
  it("WhenExtractUnknownLemmas_ThenExcludesKnownWords", () => {
    const segments = [
      makeSegment("a b", [
        makeToken({ lemma: "gato", isKnown: true }),
        makeToken({ lemma: "perro", isKnown: false }),
      ]),
    ];
    const result = extractUnknownLemmas(segments);
    expect(result).toContain("perro");
    expect(result).not.toContain("gato");
  });

  it("WhenExtractUnknownLemmas_ThenDeduplicates", () => {
    const segments = [
      makeSegment("a", [makeToken({ lemma: "gato" })]),
      makeSegment("b", [makeToken({ lemma: "gato" })]),
    ];
    const result = extractUnknownLemmas(segments);
    expect(result.filter((l) => l === "gato")).toHaveLength(1);
  });
});

describe("extractUniqueLemmas", () => {
  it("WhenExtractUniqueLemmas_ThenExcludesStopAndPunct", () => {
    const segments = [
      makeSegment("a", [
        makeToken({ lemma: "el", is_stop: true }),
        makeToken({ lemma: "coma", pos: "PUNCT", is_stop: false }),
        makeToken({ lemma: "gato", is_stop: false }),
      ]),
    ];
    const result = extractUniqueLemmas(segments);
    expect(result).not.toContain("el");
    expect(result).not.toContain("coma");
    expect(result).toContain("gato");
  });

  it("WhenExtractUniqueLemmas_ThenRespectsLimit", () => {
    const segments = [
      makeSegment("a", [
        makeToken({ lemma: "uno" }),
        makeToken({ lemma: "dos" }),
        makeToken({ lemma: "tres" }),
      ]),
    ];
    const result = extractUniqueLemmas(segments, 2);
    expect(result).toHaveLength(2);
  });
});

describe("mapTranslationsToSegments", () => {
  it("WhenMapTranslationsToSegments_ThenAppliesLemmaTranslations", () => {
    const segments = [makeSegment("gato", [makeToken({ lemma: "gato" })])];
    const result = mapTranslationsToSegments(
      segments,
      ["gato"],
      ["cat"],
      ["The cat"],
    );
    expect(result[0].tokens[0].translation).toBe("cat");
  });

  it("WhenMapTranslationsToSegments_ThenAppliesSentenceTranslations", () => {
    const segments = [makeSegment("gato", [makeToken({ lemma: "gato" })])];
    const result = mapTranslationsToSegments(
      segments,
      ["gato"],
      ["cat"],
      ["The cat sat"],
    );
    expect(result[0].translation).toBe("The cat sat");
  });
});
