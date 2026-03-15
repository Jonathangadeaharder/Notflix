import { auth } from "$lib/server/infrastructure/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { requestContext } from "$lib/server/request-context";
import { randomUUID } from "crypto";
import { orchestrator } from "$lib/server/infrastructure/container";

// Startup Logic (Runs once per worker)
if (!building) {
  (async () => {
    try {
      console.log("[System] Initializing Services...");
      await orchestrator.cleanupStaleTasks();
    } catch (err) {
      console.error("[System] Startup Cleanup Failed:", err);
    }
  })();
}

export async function handle({ event, resolve }) {
  const requestId = event.request.headers.get("x-request-id") || randomUUID();

  return requestContext.run({ requestId }, async () => {
    event.locals.auth = () =>
      auth.api.getSession({
        headers: event.request.headers,
      });

    const response = await svelteKitHandler({ event, resolve, auth, building });
    response.headers.set("x-request-id", requestId);
    return response;
  });
}
