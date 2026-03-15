import { resolveSession } from "$lib/server/infrastructure/auth";
import type { Session } from "$lib/server/infrastructure/auth";
import { building } from "$app/environment";
import { requestContext } from "$lib/server/request-context";
import { randomUUID } from "crypto";
import { Orchestrator } from "$lib/server/services/video-orchestrator.service";
import { RealAiGateway } from "$lib/server/adapters/real-ai-gateway";
import { SmartFilter } from "$lib/server/services/linguistic-filter.service";
import { db } from "$lib/server/infrastructure/database";
import type { Handle } from "@sveltejs/kit";

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
