import { subtitleService } from '$lib/server/infrastructure/container';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SubtitleMode } from '$lib/server/services/subtitle.service';

export const GET: RequestHandler = async ({ params, url }) => {
    const videoId = params.id;
    const mode = (url.searchParams.get('mode') || 'native') as SubtitleMode;

    if (!videoId) throw error(400, "Missing videoId");

    const srtContent = await subtitleService.getSrt(videoId, mode);

    if (!srtContent) {
        throw error(404, "Subtitles not found or not yet processed");
    }

    return new Response(srtContent, {
        headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=3600'
        }
    });
};
