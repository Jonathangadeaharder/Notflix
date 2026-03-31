import { resolveSession } from "$lib/server/infrastructure/auth";
import type { Session } from "$lib/server/infrastructure/auth";
import { building } from "$app/environment";
import { requestContext } from "$lib/server/request-context";
import { randomUUID } from "crypto";
import { Orchestrator } from "$lib/server/services/video-orchestrator.service";
import { RealAiGateway } from "$lib/server/adapters/real-ai-gateway";
import { SmartFilter } from "$lib/server/services/linguistic-filter.service";
import { db } from "$lib/server/infrastructure/database";
import { user as userTable } from "@notflix/database";
import { eq } from "drizzle-orm";
import type { Handle } from "@sveltejs/kit";

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
      console.log("[System] Initializing Services...");
      const orchestrator = new Orchestrator(
        new RealAiGateway(),
        db,
        new SmartFilter(db),
      );
      await orchestrator.cleanupStaleTasks();
    } catch (err) {
      console.error("[System] Startup Cleanup Failed:", err);
    }
  })();
}

export const handle: Handle = async ({ event, resolve }) => {
  const requestId = event.request.headers.get("x-request-id") || randomUUID();

  return requestContext.run({ requestId }, async () => {
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

    const response = await resolve(event, {
      filterSerializedResponseHeaders: (name) =>
        name === "content-range" || name === "x-supabase-api-version",
    });
    response.headers.set("x-request-id", requestId);
    return response;
  });
};
