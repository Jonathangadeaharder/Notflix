import { and, eq } from 'drizzle-orm';
import { INDICES } from '$lib/constants';
import { type DbTokenAnalysis, videoProcessing } from '$lib/server/db/schema';
import { db as defaultDb } from '$lib/server/infrastructure/database';
import type { VttSegment } from '../domain/translation-core';
import { getKnownLemmas } from './knowledge.service';

type Db = typeof defaultDb;

// Types for our deck
export type GameCard = {
  lemma: string;
  lang: string;
  original: string;
  contextSentence: string;
  cefr: string; // A1-C2
  translation: string;
  isKnown: boolean;
};

type CandidateWithMetadata = DbTokenAnalysis & { context: string };

const DEFAULT_DECK_LIMIT = 15;

export async function generateDeck(
  userId: string,
  videoId: string,
  startTime: number,
  endTime: number,
  targetLang: string,
  limit = DEFAULT_DECK_LIMIT,
  database: Db = defaultDb,
): Promise<GameCard[]> {
  const vttData = await fetchVttData(videoId, targetLang, database);
  if (!vttData) return [];

  const candidates = extractCandidates(vttData, startTime, endTime);
  if (candidates.length === 0) return [];

  const knownSet = await fetchKnownLemmas(
    userId,
    targetLang,
    candidates,
    database,
  );
  const deck = buildUniqueCards(candidates, knownSet, targetLang);

  return sortAndSliceDeck(deck, limit);
}

async function fetchVttData(
  videoId: string,
  targetLang: string,
  database: Db,
): Promise<VttSegment[] | null> {
  const [processing] = await database
    .select()
    .from(videoProcessing)
    .where(
      and(
        eq(videoProcessing.videoId, videoId),
        eq(videoProcessing.targetLang, targetLang),
      ),
    )
    .limit(1);

  if (!processing || !processing.vttJson) return null;
  return processing.vttJson as VttSegment[];
}

function extractCandidates(
  vttData: VttSegment[],
  startTime: number,
  endTime: number,
): CandidateWithMetadata[] {
  const candidates: CandidateWithMetadata[] = [];
  const CONTENT_POS = ['NOUN', 'VERB', 'ADJ'];

  // Optimization: find start index efficiently or just iterate until end
  // Assuming vttData is sorted by start time (standard VTT)

  for (const segment of vttData) {
    // If segment ends before window starts, skip (could optimize skip with findIndex)
    if (segment.end < startTime) continue;

    // If segment starts after window ends, we are done
    if (segment.start >= endTime) break;

    if (!segment.tokens) continue;

    for (const token of segment.tokens) {
      if (CONTENT_POS.includes(token.pos)) {
        candidates.push({
          ...token,
          context: segment.text,
        });
      }
    }
  }
  return candidates;
}

async function fetchKnownLemmas(
  userId: string,
  targetLang: string,
  candidates: CandidateWithMetadata[],
  database: Db,
): Promise<Set<string>> {
  const lemmaArray = Array.from(new Set(candidates.map((c) => c.lemma)));
  return getKnownLemmas(userId, targetLang, lemmaArray, database);
}

function buildUniqueCards(
  candidates: CandidateWithMetadata[],
  knownSet: Set<string>,
  targetLang: string,
): GameCard[] {
  const lemmaGroups = new Map<string, GameCard>();

  for (const c of candidates) {
    if (!lemmaGroups.has(c.lemma)) {
      lemmaGroups.set(c.lemma, {
        lemma: c.lemma,
        lang: targetLang,
        original: c.text,
        contextSentence: c.context,
        cefr: '?',
        translation: c.translation || '...',
        isKnown: knownSet.has(c.lemma),
      });
    }
  }
  return Array.from(lemmaGroups.values());
}

function sortAndSliceDeck(cards: GameCard[], limit: number): GameCard[] {
  return cards
    .sort((a, b) => {
      if (a.isKnown !== b.isKnown) return a.isKnown ? 1 : INDICES.NOT_FOUND;
      return 0;
    })
    .slice(0, limit);
}
