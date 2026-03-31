import { db } from "$lib/server/infrastructure/database";
import { knownWords, user } from "@notflix/database";
import { eq, and, sql, ilike } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

const HTTP_STATUS_SEE_OTHER = 303;
const PAGE_SIZE = 50;
const DEFAULT_LANG = "es";
const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"] as const);

type Level = (typeof LEVELS extends Set<infer T> ? T : never) | "untracked";
type Filters = {
  lang: string;
  level: Level | null;
  search: string | null;
  page: number;
  limit: number;
};
type Condition = Parameters<typeof and>[0];

async function fetchUserTargetLang(userId: string) {
  const [profile] = await db
    .select({ targetLang: user.targetLang })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return profile?.targetLang ?? null;
}

function parseLevel(rawLevel: string | null): Level | null {
  if (!rawLevel) return null;
  if (rawLevel === "untracked") return "untracked";
  return LEVELS.has(rawLevel as Level) ? (rawLevel as Level) : null;
}

function parseFilters(url: URL, fallbackLang: string): Filters {
  const lang = url.searchParams.get("lang") || fallbackLang;
  const level = parseLevel(url.searchParams.get("level"));
  const search = url.searchParams.get("search");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  return {
    lang,
    level,
    search,
    page,
    limit: PAGE_SIZE,
  };
}

function buildConditions(userId: string, filters: Filters): Condition[] {
  const conditions: Condition[] = [
    eq(knownWords.userId, userId),
    eq(knownWords.lang, filters.lang),
  ];

  if (filters.level) {
    if (filters.level === "untracked") {
      conditions.push(sql`${knownWords.level} IS NULL`);
    } else {
      conditions.push(eq(knownWords.level, filters.level));
    }
  }

  if (filters.search) {
    conditions.push(ilike(knownWords.lemma, `%${filters.search}%`));
  }

  return conditions;
}

async function fetchWords(filters: Filters, conditions: Condition[]) {
  const offset = (filters.page - 1) * filters.limit;

  return db
    .select({
      lemma: knownWords.lemma,
      lang: knownWords.lang,
      level: knownWords.level,
      isProperNoun: knownWords.isProperNoun,
    })
    .from(knownWords)
    .where(and(...conditions))
    .orderBy(knownWords.lemma)
    .limit(filters.limit)
    .offset(offset);
}

async function countWords(conditions: Condition[]) {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knownWords)
    .where(and(...conditions));

  return countResult?.count ?? 0;
}

async function fetchLevelCounts(userId: string, lang: string) {
  const rows = await db
    .select({
      level: knownWords.level,
      count: sql<number>`count(*)::int`,
    })
    .from(knownWords)
    .where(and(eq(knownWords.userId, userId), eq(knownWords.lang, lang)))
    .groupBy(knownWords.level);

  const countsMap: Record<string, number> = {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
    untracked: 0,
  };

  for (const row of rows) {
    const key = row.level ?? "untracked";
    countsMap[key] = row.count;
  }

  return countsMap;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session) {
    throw redirect(HTTP_STATUS_SEE_OTHER, "/login");
  }

  const userId = session.user.id;
  const targetLang = (await fetchUserTargetLang(userId)) ?? DEFAULT_LANG;
  const filters = parseFilters(url, targetLang);
  const conditions = buildConditions(userId, filters);

  const [words, total, levelCounts] = await Promise.all([
    fetchWords(filters, conditions),
    countWords(conditions),
    fetchLevelCounts(userId, filters.lang),
  ]);

  return {
    words,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
    filters: {
      lang: filters.lang,
      level: filters.level,
      search: filters.search,
    },
    levelCounts,
    user: session.user,
    session,
  };
};
