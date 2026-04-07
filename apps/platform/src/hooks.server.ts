import { resolveSession } from "$lib/server/infrastructure/auth";
import type { Session } from "$lib/server/infrastructure/auth";
import { building } from "$app/environment";
import { randomUUID } from "crypto";
import { db } from "$lib/server/infrastructure/database";
import { user as userTable, videoProcessing } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { json, redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";

const E2E_USER_ID = "00000000-e2e0-4000-a000-000000000000";
const SESSION_TTL_MS = 86400000;

const PROTECTED_PAGE_ROUTES = ["/studio", "/profile", "/vocabulary"];
const PROTECTED_API_PREFIX = "/api/";
const AUTH_EXEMPT_API = new Set(["/api/health"]);

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
    )[0];
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
        .set({ status: "ERROR" } as any)
        .where(eq(videoProcessing.status, "PENDING" as any));
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
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some((r) => pathname.startsWith(r));
  const isProtectedApi =
    pathname.startsWith(PROTECTED_API_PREFIX) && !AUTH_EXEMPT_API.has(pathname);

  if (isProtectedPage || isProtectedApi) {
    const session = await event.locals.auth();
    if (!session) {
      if (isProtectedApi) {
        return json({ error: "Unauthorized" }, { status: 401 });
      }
      const next = encodeURIComponent(pathname);
      return redirect(303, `/login?next=${next}`);
    }
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === "content-range" || name === "x-supabase-api-version",
  });

  response.headers.set("x-request-id", requestId);
  return response;
};
