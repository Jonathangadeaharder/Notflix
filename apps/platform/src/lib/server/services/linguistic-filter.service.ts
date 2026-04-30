import { LIMITS } from '$lib/constants';
import type { TokenAnalysis } from '../domain/translation-core';
import { db as defaultDb } from '../infrastructure/database';
import { getKnownLemmas } from './knowledge.service';

const DEFAULT_LEMMA_QUERY_BATCH_SIZE = 500;

export enum SegmentClassification {
  EASY = 'EASY', // Majority of words are known
  LEARNING = 'LEARNING', // Contains unknown words worth learning
  HARD = 'HARD', // Too many unknown words, likely confusing
}

export type FilteredSegment = {
  classification: SegmentClassification;
  unknownCount: number;
  tokens: (TokenAnalysis & { isKnown: boolean })[];
};

export class SmartFilter {
  private static readonly LEMMA_BATCH_SIZE = DEFAULT_LEMMA_QUERY_BATCH_SIZE;

  constructor(private db = defaultDb) {}

  private isLearnerContentToken(t: TokenAnalysis): boolean {
    return (
      (!t.is_stop || t.pos === 'PRON' || t.pos === 'ADP') && t.pos !== 'PUNCT'
    );
  }

  /**
   * Bulk version of filterSegment to reduce DB roundtrips.
   */
  async filterBatch(
    segmentsTokens: TokenAnalysis[][],
    userId: string,
    targetLang: string,
  ): Promise<FilteredSegment[]> {
    // 1. Extract ALL unique content lemmas from ALL segments using shared predicate
    const allLemmas = new Set<string>();
    for (const tokens of segmentsTokens) {
      tokens.forEach((t) => {
        if (this.isLearnerContentToken(t)) allLemmas.add(t.lemma);
      });
    }

    // 2. Fetch known lemmas in bounded batches to avoid unbounded IN(...) queries
    const lemmaArray = Array.from(allLemmas);
    const knownSet = new Set<string>();
    for (let i = 0; i < lemmaArray.length; i += SmartFilter.LEMMA_BATCH_SIZE) {
      const batch = lemmaArray.slice(i, i + SmartFilter.LEMMA_BATCH_SIZE);
      const batchKnown = await getKnownLemmas(
        userId,
        targetLang,
        batch,
        this.db,
      );
      batchKnown.forEach((lemma) => knownSet.add(lemma));
    }

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
        (!t.is_stop || ['PRON', 'ADP'].includes(t.pos)) && t.pos !== 'PUNCT',
    );

    const enrichedTokens = tokens.map((t) => ({
      ...t,
      isKnown: t.is_stop || t.pos === 'PUNCT' || knownSet.has(t.lemma),
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
    // Use the same predicate as classifyTokens so PRON/ADP are consistently included
    const contentTokens = tokens.filter((t) => this.isLearnerContentToken(t));
    const lemmas = contentTokens.map((t) => t.lemma);

    const knownSet = await getKnownLemmas(userId, targetLang, lemmas, this.db);

    return this.classifyTokens(tokens, knownSet);
  }
}
