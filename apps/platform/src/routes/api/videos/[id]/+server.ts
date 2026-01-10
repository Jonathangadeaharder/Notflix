import { db } from '$lib/server/infrastructure/database';
import { video, videoProcessing, videoLemmas } from '@notflix/database';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { unlink } from 'fs/promises';
import { resolve } from 'path';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
    const session = await locals.auth();
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get video to find file path
    const [vid] = await db.select().from(video).where(eq(video.id, id)).limit(1);
    if (!vid) {
        return json({ error: 'Video not found' }, { status: 404 });
    }

    try {
        // Delete dependent records (Manual cascade for safety)
        await db.delete(videoLemmas).where(eq(videoLemmas.videoId, id));
        await db.delete(videoProcessing).where(eq(videoProcessing.videoId, id));
        await db.delete(video).where(eq(video.id, id));

        // Delete files from disk
        if (vid.filePath) {
            try {
                // Resolve path just in case, though schema implies absolute
                await unlink(vid.filePath);
                console.log(`[Delete] Removed video file: ${vid.filePath}`);
            } catch (e) {
                console.warn(`[Delete] Create to remove video file ${vid.filePath}:`, e);
            }
        }

        if (vid.thumbnailPath) {
            try {
                // Attempt to delete thumbnail. 
                // Note: If thumbnailPath is relative, this might fail unless we know the root.
                // Assuming absolute as per typical upload behavior.
                await unlink(vid.thumbnailPath);
                console.log(`[Delete] Removed thumbnail: ${vid.thumbnailPath}`);
            } catch (e) {
                console.warn(`[Delete] Failed to remove thumbnail ${vid.thumbnailPath}:`, e);
            }
        }

        return json({ success: true });
    } catch (err) {
        console.error('[Delete] Operation failed:', err);
        return json({ error: 'Failed to delete video' }, { status: 500 });
    }
};
