import { db } from '$lib/server/infrastructure/database';
import { video, videoProcessing } from '@notflix/database';
import { eq, desc } from 'drizzle-orm';
import { CONFIG } from '$lib/server/infrastructure/config';
import { taskRegistry } from '$lib/server/services/task-registry.service';
import { triggerPipeline } from '$lib/server/services/pipeline-trigger';
import { toMediaUrl } from '$lib/server/utils/media-utils';

export const load = async ({ depends }) => {
    depends('app:videos');
    const videos = await db.select({
        id: video.id,
        title: video.title,
        status: videoProcessing.status,
        createdAt: video.createdAt,
        thumbnailPath: video.thumbnailPath
    })
        .from(video)
        .leftJoin(videoProcessing, eq(video.id, videoProcessing.videoId))
        .orderBy(desc(video.createdAt));

    return {
        videos: videos.map(v => ({
            ...v,
            thumbnailPath: toMediaUrl(v.thumbnailPath)
        }))
    };
};

export const actions = {
    reprocess: async ({ request, locals }) => {
        const session = await locals.auth();
        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) return { success: false };

        taskRegistry.register(
            `reprocessVideo:${id}`,
            triggerPipeline({
                videoId: id,
                targetLang: 'es', // Default for now
                nativeLang: session?.user.nativeLang || CONFIG.DEFAULT_NATIVE_LANG,
                userId: session?.user.id
            })
        );

        return { success: true };
    }
};