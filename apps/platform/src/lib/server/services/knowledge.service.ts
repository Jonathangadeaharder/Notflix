import { db } from '../infrastructure/database';
import { knownWords } from '@notflix/database';
import { eq, and, inArray } from 'drizzle-orm';

export async function getKnownLemmas(
    userId: string,
    targetLang: string,
    lemmas: string[],
    database = db
): Promise<Set<string>> {
    if (lemmas.length === 0) return new Set();

    const uniqueLemmas = Array.from(new Set(lemmas));
    const knownSet = new Set<string>();

    const userKnown = await database.select({ lemma: knownWords.lemma })
        .from(knownWords)
        .where(and(
            eq(knownWords.userId, userId),
            eq(knownWords.lang, targetLang),
            inArray(knownWords.lemma, uniqueLemmas)
        ));
    
    userKnown.forEach((k: { lemma: string }) => knownSet.add(k.lemma));
    return knownSet;
}
