import { db } from "$lib/server/infrastructure/database";
import { video, videoProcessing } from "@notflix/database";
import { eq, desc, and } from "drizzle-orm";
import { CONFIG, ProcessingStatus } from "$lib/server/infrastructure/config";
import { taskRegistry } from "$lib/server/services/task-registry.service";
import { triggerPipeline } from "$lib/server/services/pipeline-trigger";
import { toMediaUrl } from "$lib/server/utils/media-utils";

export const load = async ({ depends, locals }) => {
  depends("app:videos");
  const session = await locals.auth();
  const userTargetLang = session?.user.targetLang || CONFIG.DEFAULT_TARGET_LANG;

  // Filter JOIN to user's targetLang to avoid duplicate rows when a video has
  // multiple videoProcessing records (one per language).
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
    .leftJoin(
      videoProcessing,
      and(
        eq(video.id, videoProcessing.videoId),
        eq(videoProcessing.targetLang, userTargetLang),
      ),
    )
    .orderBy(desc(video.createdAt));

  // Determine which videos have ANY completed processing (any language).
  // Used to show "Translate to X" vs "Transcribe" button in the UI.
  const completedRows = await db
    .select({ videoId: videoProcessing.videoId })
    .from(videoProcessing)
    .where(eq(videoProcessing.status, ProcessingStatus.COMPLETED));
  const completedIds = new Set(completedRows.map((r) => r.videoId));

  return {
    userTargetLang,
    videos: videos.map((v) => ({
      ...v,
      thumbnailPath: toMediaUrl(v.thumbnailPath),
      hasAnyTranscription: completedIds.has(v.id),
    })),
  };
};

export const actions = {
  reprocess: async ({ request, locals }) => {
    const session = await locals.auth();
    const formData = await request.formData();
    const id = formData.get("id") as string;
    const targetLang =
      (formData.get("targetLang") as string) ||
      session?.user.targetLang ||
      CONFIG.DEFAULT_TARGET_LANG;

    if (!id) return { success: false };

    taskRegistry.register(
      `reprocessVideo:${id}`,
      triggerPipeline({
        videoId: id,
        targetLang,
        nativeLang: session?.user.nativeLang || CONFIG.DEFAULT_NATIVE_LANG,
        userId: session?.user.id,
      }),
    );

    return { success: true };
  },
};
