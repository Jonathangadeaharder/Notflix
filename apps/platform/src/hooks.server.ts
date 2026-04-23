import { resolveSession } from "$lib/server/infrastructure/auth";
import type { Session } from "$lib/server/infrastructure/auth";
import { building } from "$app/environment";
import { randomUUID } from "crypto";
import { db } from "$lib/server/infrastructure/database";
import { user as userTable, videoProcessing } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { json, redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";
import { resolveAuthRequirement } from "$lib/server/services/auth-routes";
import { HTTP_STATUS, INDICES } from "$lib/constants";

const E2E_USER_ID = "00000000-e2e0-4000-a000-000000000000";
const SESSION_TTL_MS = 86400000;

async function resolveE2eSession(): Promise<Session | null> {
  const [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, E2E_USER_ID))
    .limit(1);
  const testUser =
    existing ??
    (
      await db
        .insert(userTable)
        .values({
          id: E2E_USER_ID,
          name: "E2E Test User",
          email: "e2e@test.local",
          emailVerified: true,
          nativeLang: "en",
          targetLang: "es",
          gameIntervalMinutes: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning()
    )[INDICES.FIRST];
  if (!testUser) return null;
  return {
    user: testUser,
    expires: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
}

// Startup Logic (Runs once per worker)
if (!building) {
  (async () => {
    try {
      // Cleanup stale tasks from previous crash/restart
      await db
        .update(videoProcessing)
        .set({ status: "ERROR" })
        .where(eq(videoProcessing.status, "PENDING"));
    } catch (err) {
      console.error("[System] Startup cleanup failed:", err);
    }
  })();
}

export const handle: Handle = async ({ event, resolve }) => {
  const requestId = event.request.headers.get("x-request-id") || randomUUID();

  event.locals.db = db;

  let sessionCache: Session | null | undefined;
  event.locals.auth = async () => {
    if (sessionCache !== undefined) return sessionCache;
    if (process.env.PLAYWRIGHT_TEST === "true") {
      sessionCache = await resolveE2eSession();
      return sessionCache;
    }
    sessionCache = await resolveSession(event);
    return sessionCache;
  };

  // Centralized auth guard
  const { pathname } = event.url;
  const { requiresAuth, responseKind } = resolveAuthRequirement(pathname);

  if (requiresAuth) {
    const session = await event.locals.auth();
    if (!session) {
      if (responseKind === "json401") {
        return json(
          { error: "Unauthorized" },
          { status: HTTP_STATUS.UNAUTHORIZED },
        );
      }
      const next = encodeURIComponent(pathname);
      return redirect(HTTP_STATUS.SEE_OTHER, `/login?next=${next}`);
    }
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === "content-range" || name === "x-supabase-api-version",
  });

  response.headers.set("x-request-id", requestId);
  return response;
};
