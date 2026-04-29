import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { video, videoProcessing } from '$lib/server/db/schema';
import { db } from '$lib/server/infrastructure/database';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const videos = await db
    .select({
      id: video.id,
      status: videoProcessing.status,
    })
    .from(video)
    .leftJoin(videoProcessing, eq(video.id, videoProcessing.videoId));

  return json({ videos });
};
