import { db } from "$lib/server/infrastructure/database";
import { video, videoProcessing } from "@notflix/database";
import { eq, desc } from "drizzle-orm";
import { orchestrator } from "$lib/server/infrastructure/container";
import { CONFIG } from "$lib/server/infrastructure/config";
import { taskRegistry } from "$lib/server/services/task-registry.service";
import { toMediaUrl } from "$lib/server/utils/media-utils";

export const load = async ({ depends }) => {
  depends("app:videos");
  const videos = await db
    .select({
      id: video.id,
      title: video.title,
      status: videoProcessing.status,
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

    taskRegistry.register(
      `reprocessVideo:${id}`,
      orchestrator.processVideo(
        id,
        "es", // Default for now
        session?.user.nativeLang || CONFIG.DEFAULT_NATIVE_LANG,
        session?.user.id,
      ),
    );

    return { success: true };
  },
};
