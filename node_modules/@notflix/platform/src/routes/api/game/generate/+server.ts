import { json } from '@sveltejs/kit';
import { generateDeck } from '$lib/server/services/chunker.service';
import type { RequestHandler } from './$types';

const DEFAULT_END_TIME = 600;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_BAD_REQUEST = 400;

export const GET: RequestHandler = async ({ url, locals }) => {
    const session = await locals.auth();
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: HTTP_STATUS_UNAUTHORIZED });
    }

    const userId = session.user.id;

    const videoId = url.searchParams.get('videoId');
    const start = parseInt(url.searchParams.get('start') || '0', 10);
    const end = parseInt(url.searchParams.get('end') || DEFAULT_END_TIME.toString(), 10);
    const targetLang = url.searchParams.get('targetLang') || 'es';

    if (!videoId) {
        return json({ error: 'Missing videoId' }, { status: HTTP_STATUS_BAD_REQUEST });
    }

    const cards = await generateDeck(
        userId,
        videoId,
        start,
        end,
        targetLang
    );

    return json({
        nextChunkStart: end,
        cards
    });
};