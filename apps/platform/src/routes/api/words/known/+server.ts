import { json } from "@sveltejs/kit";
import { db } from "$lib/server/infrastructure/database";
import { knownWords } from "$lib/server/db/schema";
import type { RequestHandler } from "./$types";
import { z } from "zod";

const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_UNAUTHORIZED = 401;

const knownWordSchema = z.object({
  lemma: z.string().min(1).max(200),
  lang: z
    .string()
    .regex(/^[a-z]{2,5}$/i, "lang must be a 2-5 letter language code"),
});

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS_UNAUTHORIZED },
    );
  }
  const userId = session.user.id;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: HTTP_STATUS_BAD_REQUEST });
  }

  const { lemma, lang } = body;

  if (!lemma || !lang) {
    return json(
      { error: "Missing lemma or lang" },
      { status: HTTP_STATUS_BAD_REQUEST },
    );
  }

  const parsed = knownWordSchema.safeParse({ lemma, lang });
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: HTTP_STATUS_BAD_REQUEST },
    );
  }

  try {
    await db
      .insert(knownWords)
      .values({
        userId,
        lemma,
        lang,
        level: null, // User-defined/manual
      })
      .onConflictDoNothing(); // If already known, do nothing

    return json({ success: true }, { status: HTTP_STATUS_OK });
  } catch (e) {
    console.error("Failed to save known word:", e);
    return json({ error: "Database error" }, { status: 500 });
  }
};
