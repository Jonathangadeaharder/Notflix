import { auth } from "$lib/server/infrastructure/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { requestContext } from "$lib/server/request-context";
import { randomUUID } from 'crypto';
import { Orchestrator } from "$lib/server/services/video-orchestrator.service";
import { RealAiGateway } from "$lib/server/adapters/real-ai-gateway";
import { SmartFilter } from "$lib/server/services/linguistic-filter.service";
import { db } from "$lib/server/infrastructure/database";

// Startup Logic (Runs once per worker)
if (!building) {
    (async () => {
        try {
            console.log('[System] Initializing Services...');
            const orchestrator = new Orchestrator(new RealAiGateway(), db, new SmartFilter(db));
            await orchestrator.cleanupStaleTasks();
        } catch (err) {
            console.error('[System] Startup Cleanup Failed:', err);
        }
    })();
}

export async function handle({ event, resolve }) {
    const requestId = event.request.headers.get('x-request-id') || randomUUID();

    return requestContext.run({ requestId }, async () => {
        event.locals.auth = () => auth.api.getSession({
            headers: event.request.headers
        });

        const response = await svelteKitHandler({ event, resolve, auth, building });
        response.headers.set('x-request-id', requestId);
        return response;
    });
}