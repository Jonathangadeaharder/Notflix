import { db } from '$lib/server/infrastructure/database';
import { video, user, videoProcessing } from '@notflix/database';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { toMediaUrl } from '$lib/server/utils/media-utils';

const DEFAULT_GAME_INTERVAL = 10;

export const load: PageServerLoad = async ({ params, locals, url }) => {
    const videoId = params.id;
    const session = await locals.auth();
    const targetLang = url.searchParams.get('lang') || 'es';

    // Fetch video details joined with processing info for targetLang
    const [vid] = await db.select({
        id: video.id,
        title: video.title,
        filePath: video.filePath,
        thumbnailPath: video.thumbnailPath,
        duration: video.duration,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        views: video.views,
        published: video.published,
        targetLang: videoProcessing.targetLang
    })
        .from(video)
        .leftJoin(videoProcessing, and(
            eq(video.id, videoProcessing.videoId),
            eq(videoProcessing.targetLang, targetLang)
        ))
        .where(eq(video.id, videoId))
        .limit(1);

    if (vid) {
        vid.filePath = toMediaUrl(vid.filePath);
        vid.thumbnailPath = toMediaUrl(vid.thumbnailPath);
    }

    let userProfile = null;
    let gameInterval = DEFAULT_GAME_INTERVAL;
    if (session) {
        // Fetch user settings
        const [profile] = await db.select()
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);
        
        userProfile = profile;
        gameInterval = profile?.gameIntervalMinutes ?? DEFAULT_GAME_INTERVAL;
    }

    return {
        video: vid,
        profile: userProfile,
        gameInterval,
        user: session?.user ?? null,
        session
    };
};