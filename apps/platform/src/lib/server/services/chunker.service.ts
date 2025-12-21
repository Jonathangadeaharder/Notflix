import { db } from '$lib/server/infrastructure/database';
import { videoProcessing, knownWords, type DbTokenAnalysis } from '@notflix/database';
import { and, eq, inArray } from 'drizzle-orm';
import type { VttSegment } from './video-orchestrator.service';

// Types for our deck
export type GameCard = {
    lemma: string;
    original: string;
    contextSentence: string;
    cefr: string; // A1-C2
    translation: string;
    isKnown: boolean;
};

type CandidateWithMetadata = DbTokenAnalysis & { context: string };

export async function generateDeck(
    userId: string,
    videoId: string,
    startTime: number,
    endTime: number,
    targetLang: string,
    limit = 15
): Promise<GameCard[]> {
    const vttData = await fetchVttData(videoId, targetLang);
    if (!vttData) return [];

    const candidates = extractCandidates(vttData, startTime, endTime);
    if (candidates.length === 0) return [];

    const knownSet = await fetchKnownLemmas(userId, targetLang, candidates);
    const deck = buildUniqueCards(candidates, knownSet);

    return sortAndSliceDeck(deck, limit);
}

async function fetchVttData(videoId: string, targetLang: string): Promise<VttSegment[] | null> {
    const [processing] = await db.select()
        .from(videoProcessing)
        .where(and(
            eq(videoProcessing.videoId, videoId),
            eq(videoProcessing.targetLang, targetLang)
        ))
        .limit(1);

    if (!processing || !processing.vttJson) return null;
    return processing.vttJson as VttSegment[];
}

function extractCandidates(vttData: VttSegment[], startTime: number, endTime: number): CandidateWithMetadata[] {
    const candidates: CandidateWithMetadata[] = [];
    const CONTENT_POS = ['NOUN', 'VERB', 'ADJ'];

    for (const segment of vttData) {
        if (segment.start < startTime || segment.end >= endTime) continue;
        if (!segment.tokens) continue;

        for (const token of segment.tokens) {
            if (CONTENT_POS.includes(token.pos)) {
                candidates.push({
                    ...token,
                    context: segment.text
                });
            }
        }
    }
    return candidates;
}

async function fetchKnownLemmas(userId: string, targetLang: string, candidates: CandidateWithMetadata[]): Promise<Set<string>> {
    const lemmaArray = Array.from(new Set(candidates.map(c => c.lemma)));
    if (lemmaArray.length === 0) return new Set();

    const knownInChunk = await db.select({ lemma: knownWords.lemma })
        .from(knownWords)
        .where(and(
            eq(knownWords.userId, userId),
            eq(knownWords.lang, targetLang),
            inArray(knownWords.lemma, lemmaArray)
        ));
    
    return new Set(knownInChunk.map(k => k.lemma));
}

function buildUniqueCards(candidates: CandidateWithMetadata[], knownSet: Set<string>): GameCard[] {
    const lemmaGroups = new Map<string, GameCard>();

    for (const c of candidates) {
        if (!lemmaGroups.has(c.lemma)) {
            lemmaGroups.set(c.lemma, {
                lemma: c.lemma,
                original: c.text,
                contextSentence: c.context,
                cefr: '?', 
                translation: c.translation || '...',
                isKnown: knownSet.has(c.lemma)
            });
        }
    }
    return Array.from(lemmaGroups.values());
}

function sortAndSliceDeck(cards: GameCard[], limit: number): GameCard[] {
    return cards
        .sort((a, b) => {
            if (a.isKnown !== b.isKnown) return a.isKnown ? 1 : -1;
            return 0;
        })
        .slice(0, limit);
}