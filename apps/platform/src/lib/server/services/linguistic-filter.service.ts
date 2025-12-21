import { db as defaultDb } from '../infrastructure/database';
import { knownWords } from '@notflix/database';
import { eq, and, inArray } from 'drizzle-orm';
import type { TokenAnalysis } from '../domain/interfaces';

export enum SegmentClassification {
    EASY = 'EASY',           // Majority of words are known
    LEARNING = 'LEARNING',   // Contains unknown words worth learning
    HARD = 'HARD'            // Too many unknown words, likely confusing
}

export type FilteredSegment = {
    classification: SegmentClassification;
    unknownCount: number;
    tokens: (TokenAnalysis & { isKnown: boolean })[];
};

export class SmartFilter {
    private readonly MAX_UNKNOWN_FOR_LEARNING = 3;
    private readonly MAX_RATIO_FOR_LEARNING = 0.4;

    constructor(private db = defaultDb) {}

    /**
     * Analyzes tokens against user knowledge and classifies the segment.
     */
    async filterSegment(
        tokens: TokenAnalysis[],
        userId: string,
        targetLang: string
    ): Promise<FilteredSegment> {
        // 1. Extract content lemmas (ignore stop words and punctuation)
        const contentTokens = tokens.filter(t => !t.is_stop && t.pos !== 'PUNCT');
        const lemmas = contentTokens.map(t => t.lemma);

        // 2. Lookup known status
        const knownSet = new Set<string>();
        if (lemmas.length > 0) {
            const userKnown = await this.db.select({ lemma: knownWords.lemma })
                .from(knownWords)
                .where(and(
                    eq(knownWords.userId, userId),
                    eq(knownWords.lang, targetLang),
                    inArray(knownWords.lemma, lemmas)
                ));
            userKnown.forEach((k: { lemma: string }) => knownSet.add(k.lemma));
        }

        // 3. Enrich tokens with known status
        const enrichedTokens = tokens.map(t => ({
            ...t,
            isKnown: t.is_stop || t.pos === 'PUNCT' || knownSet.has(t.lemma)
        }));

        // 4. Classification logic
        const unknownCount = contentTokens.filter(t => !knownSet.has(t.lemma)).length;
        const totalContentCount = contentTokens.length;
        
        let classification = SegmentClassification.EASY;
        
        if (totalContentCount > 0) {
            const unknownRatio = unknownCount / totalContentCount;
            
            const isLearning = unknownCount > 0 && 
                               unknownCount <= this.MAX_UNKNOWN_FOR_LEARNING && 
                               unknownRatio <= this.MAX_RATIO_FOR_LEARNING;
            
            const isHard = unknownCount > this.MAX_UNKNOWN_FOR_LEARNING || 
                           unknownRatio > this.MAX_RATIO_FOR_LEARNING;

            if (isLearning) {
                classification = SegmentClassification.LEARNING;
            } else if (isHard) {
                classification = SegmentClassification.HARD;
            }
        }

        return {
            classification,
            unknownCount,
            tokens: enrichedTokens
        };
    }
}