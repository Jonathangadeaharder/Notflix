import { json } from "@sveltejs/kit";
import { db } from "$lib/server/infrastructure/database";
import { knownWords } from "$lib/server/db/schema";
import type { RequestHandler } from "./$types";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { HTTP_STATUS } from "$lib/constants";

const MAX_LEMMA_LENGTH = 200;

const knownWordSchema = z.object({
  lemma: z.string().min(1).max(MAX_LEMMA_LENGTH),
  lang: z
    .string()
    .regex(/^[a-z]{2,5}$/i, "lang must be a 2-5 letter language code"),
});

type ParseResult =
  | { ok: false; errorResponse: Response }
  | { ok: true; lemma: string; lang: string };

async function parseKnownWordRequest(request: Request): Promise<ParseResult> {
  let body;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      errorResponse: json(
        { error: "Invalid JSON" },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
  }

  if (!body || typeof body !== "object") {
    return {
      ok: false,
      errorResponse: json(
        { error: "Invalid JSON body" },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
  }

  const { lemma, lang } = body as Record<string, unknown>;
  if (typeof lemma !== "string" || typeof lang !== "string") {
    return {
      ok: false,
      errorResponse: json(
        { error: "Missing lemma or lang" },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
  }

  const parsed = knownWordSchema.safeParse({ lemma, lang });
  if (!parsed.success) {
    return {
      ok: false,
      errorResponse: json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
  }

  return { ok: true, lemma, lang };
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  const parsed = await parseKnownWordRequest(request);
  if (!parsed.ok) return parsed.errorResponse;

  try {
    await db
      .insert(knownWords)
      .values({
        userId: session.user.id,
        lemma: parsed.lemma,
        lang: parsed.lang,
        level: null,
      })
      .onConflictDoNothing();

    return json({ success: true }, { status: HTTP_STATUS.OK });
  } catch (e) {
    console.error("Failed to save known word:", e);
    return json(
      { error: "Database error" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  const parsed = await parseKnownWordRequest(request);
  if (!parsed.ok) return parsed.errorResponse;

  try {
    const result = await db
      .delete(knownWords)
      .where(
        and(
          eq(knownWords.userId, session.user.id),
          eq(knownWords.lemma, parsed.lemma),
          eq(knownWords.lang, parsed.lang),
        ),
      )
      .returning();

    if (result.length === 0) {
      return json(
        { error: "Word not found in known_words" },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    return json({ success: true }, { status: HTTP_STATUS.OK });
  } catch (e) {
    console.error("Failed to delete known word:", e);
    return json(
      { error: "Database error" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
};
