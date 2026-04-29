import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import {
  knownWords,
  videoLemmas,
  videoProcessing,
} from '$lib/server/db/schema';
import { db } from '../infrastructure/database';

const TREND_DAYS = 14;
const READY_LEMMAS_LIMIT = 12;
const READY_LEMMAS_FETCH_MULTIPLIER = 3;
const HARD_LEMMA_COUNT_THRESHOLD = 3;
const ISO_DATE_SLICE_END = 10;

export interface LemmaTrendPoint {
  day: string;
  count: number;
}

export interface ReadyLemma {
  word: string;
  state: 'hard' | 'learn';
}

export interface KnowledgeGapStats {
  knownCount: number;
  trend: LemmaTrendPoint[];
  readyLemmas: ReadyLemma[];
}

export async function getKnowledgeGapStats(
  userId: string | null | undefined,
  targetLang = 'es',
): Promise<KnowledgeGapStats> {
  const knownCount = await getKnownCount(userId, targetLang);
  const trend = await getLemmaTrend(targetLang);
  const readyLemmas = await getReadyLemmas(userId, targetLang);

  return { knownCount, trend, readyLemmas };
}

async function getKnownCount(
  userId: string | null | undefined,
  targetLang: string,
): Promise<number> {
  if (!userId) return 0;

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knownWords)
    .where(and(eq(knownWords.userId, userId), eq(knownWords.lang, targetLang)));

  return result?.count ?? 0;
}

async function getLemmaTrend(targetLang: string): Promise<LemmaTrendPoint[]> {
  const startDay = new Date();
  startDay.setUTCHours(0, 0, 0, 0);
  startDay.setUTCDate(startDay.getUTCDate() - (TREND_DAYS - 1));

  const dayExpr = sql<string>`to_char(date_trunc('day', timezone('UTC', ${videoProcessing.createdAt})), 'YYYY-MM-DD')`;

  const processingCounts = await db
    .select({
      day: dayExpr,
      count: sql<number>`count(*)::int`,
    })
    .from(videoProcessing)
    .where(
      and(
        eq(videoProcessing.targetLang, targetLang),
        eq(videoProcessing.status, 'COMPLETED'),
        gte(videoProcessing.createdAt, startDay),
      ),
    )
    .groupBy(dayExpr);

  const countsByDay = new Map(
    processingCounts.map((row) => [row.day, row.count] as const),
  );

  const points: LemmaTrendPoint[] = [];
  for (let i = 0; i < TREND_DAYS; i++) {
    const day = new Date(startDay);
    day.setUTCDate(startDay.getUTCDate() + i);
    const dayStr = day.toISOString().slice(0, ISO_DATE_SLICE_END);
    points.push({ day: dayStr, count: countsByDay.get(dayStr) ?? 0 });
  }

  return points;
}

async function fetchKnownLemmas(
  userId: string,
  targetLang: string,
  lemmaTexts: string[],
): Promise<Set<string>> {
  if (lemmaTexts.length === 0) return new Set<string>();
  const known = await db
    .select({ lemma: knownWords.lemma })
    .from(knownWords)
    .where(
      and(
        eq(knownWords.userId, userId),
        eq(knownWords.lang, targetLang),
        inArray(knownWords.lemma, lemmaTexts),
      ),
    );
  return new Set(known.map((k) => k.lemma));
}

async function getReadyLemmas(
  userId: string | null | undefined,
  targetLang: string,
): Promise<ReadyLemma[]> {
  const recentLemmas = await db
    .select({
      lemma: videoLemmas.lemma,
      count: videoLemmas.count,
    })
    .from(videoLemmas)
    .innerJoin(
      videoProcessing,
      eq(videoLemmas.videoId, videoProcessing.videoId),
    )
    .where(eq(videoProcessing.targetLang, targetLang))
    .orderBy(desc(videoLemmas.count))
    .limit(READY_LEMMAS_LIMIT * READY_LEMMAS_FETCH_MULTIPLIER);

  if (!userId || recentLemmas.length === 0) {
    return recentLemmas.slice(0, READY_LEMMAS_LIMIT).map((l) => ({
      word: l.lemma,
      state: 'learn' as const,
    }));
  }

  const knownSet = await fetchKnownLemmas(
    userId,
    targetLang,
    recentLemmas.map((l) => l.lemma),
  );

  return recentLemmas
    .filter((l) => !knownSet.has(l.lemma))
    .slice(0, READY_LEMMAS_LIMIT)
    .map((l) => ({
      word: l.lemma,
      state:
        l.count >= HARD_LEMMA_COUNT_THRESHOLD
          ? ('hard' as const)
          : ('learn' as const),
    }));
}
