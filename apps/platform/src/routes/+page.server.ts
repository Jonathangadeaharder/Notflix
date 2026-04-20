import type { RequestEvent } from "@sveltejs/kit";
import { db } from "$lib/server/infrastructure/database";
import { ProcessingStatus } from "$lib/server/infrastructure/config";
import {
  computeComprehensionPercent,
  getDashboardStatusLabel,
  pickFeaturedVideo,
  type DashboardVideo,
} from "$lib/server/services/dashboard-metrics";
import { toMediaUrl } from "$lib/server/utils/media-utils";
import {
  type DbVttSegment,
  video,
  videoProcessing,
  watchProgress,
} from "$lib/server/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

const DASHBOARD_VIDEO_LIMIT = 12;
const DEFAULT_TARGET_LANGUAGE = "es";
const DEFAULT_PROGRESS_STAGE = "QUEUED";

type DashboardRow = {
  id: string;
  title: string;
  thumbnailPath: string | null;
  createdAt: Date;
  views: number;
  status: string | null;
  progressStage: string | null;
  progressPercent: number | null;
  targetLang: string | null;
  vttJson: DbVttSegment[] | null;
};

type SavedProgress = {
  videoId: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
};

async function fetchDashboardRows(): Promise<DashboardRow[]> {
  return db
    .select({
      id: video.id,
      title: video.title,
      thumbnailPath: video.thumbnailPath,
      createdAt: video.createdAt,
      views: video.views,
      status: videoProcessing.status,
      progressStage: videoProcessing.progressStage,
      progressPercent: videoProcessing.progressPercent,
      targetLang: videoProcessing.targetLang,
      vttJson: videoProcessing.vttJson,
    })
    .from(video)
    .leftJoin(videoProcessing, eq(video.id, videoProcessing.videoId))
    .orderBy(desc(video.createdAt))
    .limit(DASHBOARD_VIDEO_LIMIT) as Promise<DashboardRow[]>;
}

async function fetchSavedProgressMap(
  userId: string | null | undefined,
  videoIds: string[],
) {
  if (!userId || videoIds.length === 0) {
    return new Map<string, SavedProgress>();
  }

  const savedProgress = await db
    .select({
      videoId: watchProgress.videoId,
      currentTime: watchProgress.currentTime,
      duration: watchProgress.duration,
      progressPercent: watchProgress.progressPercent,
    })
    .from(watchProgress)
    .where(
      and(
        eq(watchProgress.userId, userId),
        inArray(watchProgress.videoId, videoIds),
      ),
    );

  return new Map(savedProgress.map((progress) => [progress.videoId, progress]));
}

function buildDashboardVideo(
  row: DashboardRow,
  progressMap: Map<string, SavedProgress>,
): DashboardVideo {
  const savedProgress = progressMap.get(row.id);
  const watchState = getWatchState(savedProgress);
  const processingState = getProcessingState(row, watchState.watchPercent);

  return {
    id: row.id,
    title: row.title,
    thumbnailPath: toMediaUrl(row.thumbnailPath),
    createdAt: row.createdAt,
    views: row.views,
    ...processingState,
    ...watchState,
    comprehensionPercent: computeComprehensionPercent(row.vttJson),
  };
}

function getWatchState(savedProgress: SavedProgress | undefined) {
  return {
    watchPercent: savedProgress?.progressPercent ?? 0,
    watchSeconds: savedProgress?.currentTime ?? 0,
    watchDuration: savedProgress?.duration ?? 0,
  };
}

function getProcessingState(row: DashboardRow, watchPercent: number) {
  return {
    targetLang: row.targetLang || DEFAULT_TARGET_LANGUAGE,
    status: row.status || ProcessingStatus.PENDING,
    statusLabel: getDashboardStatusLabel(row.status, watchPercent),
    progressStage: row.progressStage || DEFAULT_PROGRESS_STAGE,
    processingPercent: row.progressPercent ?? 0,
  };
}

export const load = async ({ locals }: RequestEvent) => {
  const session = await locals.auth();
  const rows = await fetchDashboardRows();
  const progressMap = await fetchSavedProgressMap(
    session?.user.id,
    rows.map((row) => row.id),
  );
  const videos = rows.map((row) => buildDashboardVideo(row, progressMap));
  const { featuredVideo, continueWatching } = pickFeaturedVideo(videos);

  return {
    session,
    continueWatching,
    featuredVideo,
    videos,
  };
};
