import type { InferSelectModel } from 'drizzle-orm';
import { and, eq } from 'drizzle-orm';
import { mapSegmentsToPlayerSubtitles } from '$lib/components/player/subtitle-mapper';
import type { Subtitle } from '$lib/components/player/types';
import {
  type DbVttSegment,
  DEFAULT_GAME_INTERVAL_MINUTES,
  user,
  video,
  videoProcessing,
} from '$lib/server/db/schema';
import type { Session } from '$lib/server/infrastructure/auth';
import { db } from '$lib/server/infrastructure/database';
import { toMediaUrl } from '$lib/server/utils/media-utils';
import type { PageServerLoad } from './$types';

type HeatmapSegment = { start: number; end: number; type: string };
type User = InferSelectModel<typeof user>;

function emptyVideoResponse(session: Session | null) {
  return {
    video: null,
    heatmap: [],
    subtitles: [] as Subtitle[],
    profile: null,
    gameInterval: DEFAULT_GAME_INTERVAL_MINUTES,
    user: session?.user ?? null,
    session,
  };
}

function isValidVttSegments(v: unknown): v is DbVttSegment[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (s) =>
      typeof s === 'object' &&
      s !== null &&
      typeof s.start === 'number' &&
      typeof s.end === 'number' &&
      Array.isArray(s.tokens),
  );
}

function generateHeatmap(vttJson: unknown): HeatmapSegment[] {
  const heatmap: HeatmapSegment[] = [];
  if (isValidVttSegments(vttJson)) {
    for (const seg of vttJson) {
      if (seg.classification) {
        heatmap.push({
          start: seg.start,
          end: seg.end,
          type: seg.classification,
        });
      }
    }
  }
  return heatmap;
}

async function fetchUserProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return profile || null;
}

async function fetchVideoWithProcessing(videoId: string, targetLang: string) {
  const [result] = await db
    .select({
      video: video,
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
  return result ?? null;
}

async function getGameInterval(
  session: Session | null,
): Promise<{ profile: User | null; interval: number }> {
  if (!session)
    return { profile: null, interval: DEFAULT_GAME_INTERVAL_MINUTES };

  const userProfile = await fetchUserProfile(session.user.id);

  if (
    process.env.PLAYWRIGHT_TEST === 'true' &&
    process.env.TEST_GAME_INTERVAL
  ) {
    return {
      profile: userProfile,
      interval: parseFloat(process.env.TEST_GAME_INTERVAL),
    };
  }

  return {
    profile: userProfile,
    interval: userProfile?.gameIntervalMinutes ?? DEFAULT_GAME_INTERVAL_MINUTES,
  };
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const session = await locals.auth();
  const targetLang = url.searchParams.get('lang') || 'es';

  const result = await fetchVideoWithProcessing(params.id, targetLang);
  if (!result?.video) return emptyVideoResponse(session);

  const vid = result.video;
  vid.filePath = toMediaUrl(vid.filePath);
  vid.thumbnailPath = toMediaUrl(vid.thumbnailPath);

  const heatmap = generateHeatmap(result.processing?.vttJson);
  const { profile, interval } = await getGameInterval(session);

  const rawSegments = isValidVttSegments(result.processing?.vttJson)
    ? result.processing.vttJson
    : undefined;
  const subtitles = mapSegmentsToPlayerSubtitles(rawSegments);

  return {
    video: { ...vid, targetLang: result.processing?.targetLang },
    heatmap,
    subtitles,
    profile,
    gameInterval: interval,
    user: session?.user ?? null,
    session,
    processingStatus: result.processing?.status ?? null,
  };
};
