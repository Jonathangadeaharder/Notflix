import { fail } from "@sveltejs/kit";
import { db } from "$lib/server/infrastructure/database";
import { video, videoProcessing } from "$lib/server/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { CONFIG, ProcessingStatus } from "$lib/server/infrastructure/config";
import { processVideo } from "$lib/server/services/video-pipeline";
import { toMediaUrl } from "$lib/server/utils/media-utils";
import { HTTP_STATUS } from "$lib/constants";

async function fetchCompletedVideoIds(
  videoIds: string[],
): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set();
  const completedRows = await db
    .select({ videoId: videoProcessing.videoId })
    .from(videoProcessing)
    .where(
      and(
        eq(videoProcessing.status, ProcessingStatus.COMPLETED),
        inArray(videoProcessing.videoId, videoIds),
      ),
    );
  return new Set(completedRows.map((r) => r.videoId));
}

export const load = async ({ depends, locals }) => {
  depends("app:videos");
  const session = await locals.auth();
  const userTargetLang = session?.user.targetLang || CONFIG.DEFAULT_TARGET_LANG;

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

  const completedIds = await fetchCompletedVideoIds(videos.map((v) => v.id));

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

    if (!session)
      return fail(HTTP_STATUS.UNAUTHORIZED, { error: "Not authenticated" });
    if (!id)
      return fail(HTTP_STATUS.BAD_REQUEST, { error: "Video ID is required" });

    processVideo({
      videoId: id,
      targetLang,
      nativeLang: session.user.nativeLang || CONFIG.DEFAULT_NATIVE_LANG,
      userId: session.user.id,
    }).catch((err) =>
      console.error(`[Pipeline] Background error for ${id}:`, err),
    );

    return { success: true };
  },
};
