import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { taskRegistry } from '$lib/server/services/task-registry.service';
import { triggerPipeline } from '$lib/server/services/pipeline-trigger';

const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

interface ProcessRequest {
    targetLang?: string;
    nativeLang?: string;
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
    const session = await locals.auth();
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: HTTP_STATUS_UNAUTHORIZED });
    }

    const videoId = params.id;
    if (!videoId) {
        return json({ error: 'Missing videoId' }, { status: HTTP_STATUS_BAD_REQUEST });
    }

    try {
        const body = await request.json() as ProcessRequest;

        // Register background task for observability
        taskRegistry.register(
            `processVideo:${videoId}`,
            triggerPipeline({
                videoId,
                targetLang: body.targetLang || 'es',
                nativeLang: body.nativeLang || 'en',
                userId: session.user.id
            })
        );

        return json({ success: true, message: 'Processing started in background' });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Processing API Error:", message);
        return json({ error: message }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
    }
};
