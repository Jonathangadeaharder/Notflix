import { db } from "$lib/server/infrastructure/database";
import { vocabReference, user } from "@notflix/database";
import { eq, and, sql, ilike } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { HTTP_STATUS } from "$lib/constants";

// eslint-disable-next-line max-lines-per-function, complexity
export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session) {
    throw redirect(HTTP_STATUS.SEE_OTHER, "/login?next=/vocabulary");
  }

  const userId = session.user.id;

  // Get user's target language
  const [profile] = await db
    .select({ targetLang: user.targetLang })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const lang = url.searchParams.get("lang") || profile?.targetLang || "es";
  const level = url.searchParams.get("level") || null;
  const search = url.searchParams.get("search") || null;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build conditions against the global vocab reference
  const conditions = [eq(vocabReference.lang, lang)];

  if (level) {
    if (level === "untracked") {
      conditions.push(sql`${vocabReference.level} IS NULL`);
    } else {
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

  const words = await db
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

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vocabReference)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  const levelCounts = await db
    .select({
      level: vocabReference.level,
      count: sql<number>`count(*)::int`,
    })
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
    const key = row.level ?? "untracked";
    countsMap[key] = row.count;
  }

  return {
    words,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      lang,
      level,
      search,
    },
    levelCounts: countsMap,
    user: session.user,
    session,
  };
};
