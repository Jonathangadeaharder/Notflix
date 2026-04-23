import { db } from "$lib/server/infrastructure/database";
import { vocabReference, user, knownWords } from "$lib/server/db/schema";
import { eq, and, sql, ilike, inArray } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { CefrLevels } from "$lib/types";

const ALLOWED_LEVELS: Set<string> = new Set(CefrLevels);

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session) {
    throw redirect(303, "/login?next=/vocabulary");
  }
  const userId = session.user.id;

  const lang = await resolveTargetLang(userId, url);
  const conditions = buildFilterConditions(
    lang,
    url.searchParams.get("level"),
    url.searchParams.get("search"),
  );

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const [words, total, levelCounts] = await Promise.all([
    fetchVocabWords(conditions, limit, offset),
    fetchVocabCount(conditions),
    fetchLevelCounts(lang),
  ]);

  const knownSet = await fetchKnownWords(
    userId,
    lang,
    words.map((w) => w.lemma),
  );
  const wordsWithKnown = words.map((w) => ({
    ...w,
    isKnown: knownSet.has(w.lemma),
  }));

  return {
    words: wordsWithKnown,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    filters: {
      lang,
      level: url.searchParams.get("level"),
      search: url.searchParams.get("search"),
    },
    levelCounts,
    user: session.user,
    session,
  };
};

async function resolveTargetLang(userId: string, url: URL): Promise<string> {
  const paramLang = url.searchParams.get("lang");
  if (paramLang) return paramLang;

  const [profile] = await db
    .select({ targetLang: user.targetLang })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return profile?.targetLang || "es";
}

function buildFilterConditions(
  lang: string,
  level: string | null,
  search: string | null,
) {
  const conditions = [eq(vocabReference.lang, lang)];

  if (level) {
    if (level === "untracked") {
      conditions.push(sql`${vocabReference.level} IS NULL`);
    } else if (ALLOWED_LEVELS.has(level)) {
      conditions.push(
        eq(
          vocabReference.level,
          level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
        ),
      );
    }
  }

  if (search) {
    conditions.push(ilike(vocabReference.lemma, `%${search}%`));
  }

  return conditions;
}

async function fetchVocabWords(
  conditions: any[],
  limit: number,
  offset: number,
) {
  return db
    .select({
      lemma: vocabReference.lemma,
      lang: vocabReference.lang,
      level: vocabReference.level,
      isProperNoun: vocabReference.isProperNoun,
    })
    .from(vocabReference)
    .where(and(...conditions))
    .orderBy(vocabReference.lemma)
    .limit(limit)
    .offset(offset);
}

async function fetchVocabCount(conditions: any[]): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vocabReference)
    .where(and(...conditions));
  return result?.count ?? 0;
}

async function fetchLevelCounts(lang: string): Promise<Record<string, number>> {
  const levelCounts = await db
    .select({ level: vocabReference.level, count: sql<number>`count(*)::int` })
    .from(vocabReference)
    .where(eq(vocabReference.lang, lang))
    .groupBy(vocabReference.level);

  const countsMap: Record<string, number> = {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
    untracked: 0,
  };
  for (const row of levelCounts) {
    countsMap[row.level ?? "untracked"] = row.count;
  }
  return countsMap;
}

async function fetchKnownWords(
  userId: string,
  lang: string,
  lemmas: string[],
): Promise<Set<string>> {
  if (lemmas.length === 0) return new Set();
  const rows = await db
    .select({ lemma: knownWords.lemma })
    .from(knownWords)
    .where(
      and(
        eq(knownWords.userId, userId),
        eq(knownWords.lang, lang),
        inArray(knownWords.lemma, lemmas),
      ),
    );
  return new Set(rows.map((r) => r.lemma));
}
