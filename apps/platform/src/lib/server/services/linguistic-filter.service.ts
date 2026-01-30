import { db as defaultDb } from "../infrastructure/database";
import type { TokenAnalysis } from "../domain/interfaces";
import { getKnownLemmas } from "./knowledge.service";
import { LIMITS } from "$lib/constants";

export enum SegmentClassification {
  EASY = "EASY", // Majority of words are known
  LEARNING = "LEARNING", // Contains unknown words worth learning
  HARD = "HARD", // Too many unknown words, likely confusing
}

export type FilteredSegment = {
  classification: SegmentClassification;
  unknownCount: number;
  tokens: (TokenAnalysis & { isKnown: boolean })[];
};

export class SmartFilter {
  constructor(private db = defaultDb) {}

  /**
   * Bulk version of filterSegment to reduce DB roundtrips.
   */
  async filterBatch(
    segmentsTokens: TokenAnalysis[][],
    userId: string,
    targetLang: string,
  ): Promise<FilteredSegment[]> {
    // 1. Extract ALL unique content lemmas from ALL segments
    const allLemmas = new Set<string>();
    for (const tokens of segmentsTokens) {
      tokens.forEach((t) => {
        if (!t.is_stop && t.pos !== "PUNCT") allLemmas.add(t.lemma);
      });
    }

    const lemmaArray = Array.from(allLemmas);
    const knownSet = await getKnownLemmas(
      userId,
      targetLang,
      lemmaArray,
      this.db,
    );

    // 3. Process each segment using the pre-fetched knownSet
    return segmentsTokens.map((tokens) =>
      this.classifyTokens(tokens, knownSet),
    );
  }

  private classifyTokens(
    tokens: TokenAnalysis[],
    knownSet: Set<string>,
  ): FilteredSegment {
    // Include functional categories that are often stop words but hard for learners (Pronouns, Prepositions)
    const contentTokens = tokens.filter(
      (t) =>
        (!t.is_stop || ["PRON", "ADP"].includes(t.pos)) && t.pos !== "PUNCT",
    );

    const enrichedTokens = tokens.map((t) => ({
      ...t,
      isKnown: t.is_stop || t.pos === "PUNCT" || knownSet.has(t.lemma),
    }));

    const unknownCount = contentTokens.filter(
      (t) => !knownSet.has(t.lemma),
    ).length;
    const totalContentCount = contentTokens.length;

    let classification = SegmentClassification.EASY;

    if (totalContentCount > 0) {
      const unknownRatio = unknownCount / totalContentCount;

      const isLearning =
        unknownCount > 0 &&
        unknownCount <= LIMITS.MAX_UNKNOWN_FOR_LEARNING &&
        unknownRatio <= LIMITS.MAX_RATIO_FOR_LEARNING;

      const isHard =
        unknownCount > LIMITS.MAX_UNKNOWN_FOR_LEARNING ||
        unknownRatio > LIMITS.MAX_RATIO_FOR_LEARNING;

      if (isLearning) {
        classification = SegmentClassification.LEARNING;
      } else if (isHard) {
        classification = SegmentClassification.HARD;
      }
    }

    return {
      classification,
      unknownCount,
      tokens: enrichedTokens,
    };
  }

  /**
   * Analyzes tokens against user knowledge and classifies the segment.
   */
  async filterSegment(
    tokens: TokenAnalysis[],
    userId: string,
    targetLang: string,
  ): Promise<FilteredSegment> {
    const contentTokens = tokens.filter((t) => !t.is_stop && t.pos !== "PUNCT");
    const lemmas = contentTokens.map((t) => t.lemma);

    const knownSet = await getKnownLemmas(userId, targetLang, lemmas, this.db);

    return this.classifyTokens(tokens, knownSet);
  }
}
