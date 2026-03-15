import { GAME } from "$lib/constants";
import { mapSegmentsToPlayerSubtitles } from "$lib/components/player/subtitle-mapper";
import type { Session } from "$lib/server/infrastructure/auth";
import { db } from "$lib/server/infrastructure/database";
import { toMediaUrl } from "$lib/server/utils/media-utils";
import {
  type DbVttSegment,
  user,
  video,
  videoProcessing,
  watchProgress,
} from "@notflix/database";
import { and, eq, type InferSelectModel } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

const DEFAULT_GAME_INTERVAL = GAME.DEFAULT_INTERVAL_MINUTES;
const DEFAULT_TARGET_LANGUAGE = "es";

type User = InferSelectModel<typeof user>;
type VideoRecord = InferSelectModel<typeof video>;
type VideoProcessingRecord = InferSelectModel<typeof videoProcessing>;
type HeatmapSegment = { start: number; end: number; type: string };
type WatchQueryResult = {
  video: VideoRecord;
  processing: VideoProcessingRecord | null;
};

function generateHeatmap(
  vttJson: DbVttSegment[] | null | undefined,
): HeatmapSegment[] {
  if (!vttJson) {
    return [];
  }

  return vttJson.flatMap((segment) =>
    segment.classification
      ? [
          {
            start: segment.start,
            end: segment.end,
            type: segment.classification,
          },
        ]
      : [],
  );
}

async function fetchUserProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return profile || null;
}

async function getGameInterval(
  session: Session | null,
): Promise<{ profile: User | null; interval: number }> {
  if (!session) {
    return { profile: null, interval: DEFAULT_GAME_INTERVAL };
  }

  const userProfile = await fetchUserProfile(session.user.id);
  if (process.env.TEST_GAME_INTERVAL) {
    return {
      profile: userProfile,
      interval: parseFloat(process.env.TEST_GAME_INTERVAL),
    };
  }

  return {
    profile: userProfile,
    interval: userProfile?.gameIntervalMinutes ?? DEFAULT_GAME_INTERVAL,
  };
}

async function fetchWatchResult(videoId: string, targetLang: string) {
  const [result] = await db
    .select({
      video,
      processing: videoProcessing,
    })
    .from(video)
    .leftJoin(
      videoProcessing,
      and(
        eq(video.id, videoProcessing.videoId),
        eq(videoProcessing.targetLang, targetLang),
      ),
    )
    .where(eq(video.id, videoId))
    .limit(1);

  return result as WatchQueryResult | undefined;
}

async function fetchSavedProgressSeconds(
  session: Session | null,
  videoId: string,
) {
  if (!session) {
    return 0;
  }

  const [progress] = await db
    .select({
      currentTime: watchProgress.currentTime,
    })
    .from(watchProgress)
    .where(
      and(
        eq(watchProgress.videoId, videoId),
        eq(watchProgress.userId, session.user.id),
      ),
    )
    .limit(1);

  return progress?.currentTime ?? 0;
}

function buildEmptyPageState(session: Session | null) {
  return {
    video: null,
    subtitles: [],
    heatmap: [],
    profile: null,
    user: session?.user ?? null,
    session,
  };
}

function normalizeVideoMedia(loadedVideo: VideoRecord) {
  return {
    ...loadedVideo,
    filePath: toMediaUrl(loadedVideo.filePath),
    thumbnailPath: toMediaUrl(loadedVideo.thumbnailPath),
  };
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const session = await locals.auth();
  const targetLang = url.searchParams.get("lang") || DEFAULT_TARGET_LANGUAGE;
  const result = await fetchWatchResult(params.id, targetLang);

  if (!result?.video) {
    return buildEmptyPageState(session);
  }

  const vttSegments = result.processing?.vttJson as
    | DbVttSegment[]
    | null
    | undefined;
  const [videoProgress, { profile, interval }] = await Promise.all([
    fetchSavedProgressSeconds(session, params.id),
    getGameInterval(session),
  ]);

  return {
    video: {
      ...normalizeVideoMedia(result.video),
      targetLang: result.processing?.targetLang,
      videoProgress,
    },
    subtitles: mapSegmentsToPlayerSubtitles(vttSegments ?? []),
    heatmap: generateHeatmap(vttSegments),
    profile,
    gameInterval: interval,
    user: session?.user ?? null,
    session,
  };
};
