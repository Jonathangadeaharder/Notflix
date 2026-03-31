import { db } from "$lib/server/infrastructure/database";
import { knownWords, user } from "@notflix/database";
import { eq, and, sql, ilike, count } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

const HTTP_STATUS_SEE_OTHER = 303;

export const load: PageServerLoad = async ({ locals, url }) => {
    const session = await locals.auth();
    if (!session) {
        throw redirect(HTTP_STATUS_SEE_OTHER, "/login");
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

    // Build conditions
    const conditions = [
        eq(knownWords.userId, userId),
        eq(knownWords.lang, lang),
    ];

    if (level) {
        if (level === "untracked") {
            conditions.push(sql`${knownWords.level} IS NULL`);
        } else {
            conditions.push(eq(knownWords.level, level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2"));
        }
    }

    if (search) {
        conditions.push(ilike(knownWords.lemma, `%${search}%`));
    }

    // Fetch words
    const words = await db
        .select({
            lemma: knownWords.lemma,
            lang: knownWords.lang,
            level: knownWords.level,
            isProperNoun: knownWords.isProperNoun,
        })
        .from(knownWords)
        .where(and(...conditions))
        .orderBy(knownWords.lemma)
        .limit(limit)
        .offset(offset);

    // Get total count
    const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(knownWords)
        .where(and(...conditions));

    const total = countResult[0]?.count ?? 0;

    // Get counts per level for the sidebar
    const levelCounts = await db
        .select({
            level: knownWords.level,
            count: sql<number>`count(*)::int`,
        })
        .from(knownWords)
        .where(and(eq(knownWords.userId, userId), eq(knownWords.lang, lang)))
        .groupBy(knownWords.level);

    // Transform to a map
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
