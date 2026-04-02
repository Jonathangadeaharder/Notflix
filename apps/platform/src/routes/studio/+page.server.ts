import { db } from "$lib/server/infrastructure/database";
import { video, videoProcessing } from "@notflix/database";
import { eq, desc } from "drizzle-orm";
import { toMediaUrl } from "$lib/server/utils/media-utils";
import { startVideoProcessingWithDefaults } from "$lib/server/services/process-video-request.service";

export const load = async ({ depends }) => {
  depends("app:videos");
  const videos = await db
    .select({
      id: video.id,
      title: video.title,
      status: videoProcessing.status,
      progressStage: videoProcessing.progressStage,
      progressPercent: videoProcessing.progressPercent,
      createdAt: video.createdAt,
      thumbnailPath: video.thumbnailPath,
    })
    .from(video)
    .leftJoin(videoProcessing, eq(video.id, videoProcessing.videoId))
    .orderBy(desc(video.createdAt));

  return {
    videos: videos.map((v) => ({
      ...v,
      thumbnailPath: toMediaUrl(v.thumbnailPath),
    })),
  };
};

export const actions = {
  reprocess: async ({ request, locals }) => {
    const session = await locals.auth();
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) return { success: false };

    startVideoProcessingWithDefaults({
      videoId: id,
      userId: session?.user.id ?? "",
    });

    return { success: true };
  },
};
