import { db } from "../infrastructure/database";
import {
  knownWords,
  videoLemmas,
  videoProcessing,
} from "$lib/server/db/schema";
import { eq, and, gte, sql, desc, inArray } from "drizzle-orm";

const TREND_DAYS = 14;
const READY_LEMMAS_LIMIT = 12;

export interface LemmaTrendPoint {
  day: string;
  count: number;
}

export interface ReadyLemma {
  word: string;
  state: "hard" | "learn";
}

export interface KnowledgeGapStats {
  knownCount: number;
  trend: LemmaTrendPoint[];
  readyLemmas: ReadyLemma[];
}

export async function getKnowledgeGapStats(
  userId: string | null | undefined,
  targetLang = "es",
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
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - TREND_DAYS);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const processingRows = await db
    .select({ createdAt: videoProcessing.createdAt })
    .from(videoProcessing)
    .where(
      and(
        eq(videoProcessing.targetLang, targetLang),
        gte(videoProcessing.createdAt, fourteenDaysAgo),
      ),
    );

  const points: LemmaTrendPoint[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStr = day.toISOString().slice(0, 10);
    const count = processingRows.filter((row) => {
      if (!row.createdAt) return false;
      return row.createdAt.toISOString().slice(0, 10) === dayStr;
    }).length;
    points.push({ day: dayStr, count });
  }

  return points;
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
    .orderBy(desc(videoLemmas.count))
    .limit(READY_LEMMAS_LIMIT * 3);

  if (!userId || recentLemmas.length === 0) {
    return recentLemmas.slice(0, READY_LEMMAS_LIMIT).map((l) => ({
      word: l.lemma,
      state: "learn" as const,
    }));
  }

  const lemmaTexts = recentLemmas.map((l) => l.lemma);
  const knownSet = new Set<string>();

  if (lemmaTexts.length > 0) {
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
    known.forEach((k) => knownSet.add(k.lemma));
  }

  return recentLemmas
    .filter((l) => !knownSet.has(l.lemma))
    .slice(0, READY_LEMMAS_LIMIT)
    .map((l) => ({
      word: l.lemma,
      state: l.count >= 3 ? ("hard" as const) : ("learn" as const),
    }));
}
