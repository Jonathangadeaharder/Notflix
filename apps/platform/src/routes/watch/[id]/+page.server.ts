import { db } from "$lib/server/infrastructure/database";
import {
  video,
  user,
  videoProcessing,
  type DbVttSegment,
} from "@notflix/database";
import { eq, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { toMediaUrl } from "$lib/server/utils/media-utils";

const DEFAULT_GAME_INTERVAL = 10;

type HeatmapSegment = { start: number; end: number; type: string };

function generateHeatmap(vttJson: unknown): HeatmapSegment[] {
  const heatmap: HeatmapSegment[] = [];
  if (vttJson) {
    const segments = vttJson as DbVttSegment[];
    for (const seg of segments) {
      if (seg.classification) {
        heatmap.push({
          start: seg.start,
          end: seg.end,
          type: seg.classification, // EASY, LEARNING, HARD
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

import type { Session } from "$lib/server/infrastructure/auth";

import type { InferSelectModel } from "drizzle-orm";
type User = InferSelectModel<typeof user>;

async function getGameInterval(
  session: Session | null,
): Promise<{ profile: User | null; interval: number }> {
  if (!session) return { profile: null, interval: DEFAULT_GAME_INTERVAL };

  const userProfile = await fetchUserProfile(session.user.id);

  if (
    process.env.PLAYWRIGHT_TEST === "true" &&
    process.env.TEST_GAME_INTERVAL
  ) {
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

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const videoId = params.id;
  const session = await locals.auth();
  const targetLang = url.searchParams.get("lang") || "es";

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

  if (!result || !result.video) {
    return {
      video: null,
      heatmap: [],
      profile: null,
      user: session?.user ?? null,
      session,
    };
  }

  const vid = result.video;
  vid.filePath = toMediaUrl(vid.filePath);
  vid.thumbnailPath = toMediaUrl(vid.thumbnailPath);

  const heatmap = generateHeatmap(result.processing?.vttJson);
  const { profile, interval } = await getGameInterval(session);

  return {
    video: { ...vid, targetLang: result.processing?.targetLang },
    heatmap,
    profile,
    gameInterval: interval,
    user: session?.user ?? null,
    session,
  };
};
