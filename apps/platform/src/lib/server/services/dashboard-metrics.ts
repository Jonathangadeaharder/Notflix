import type { DbVttSegment } from "$lib/server/db/schema";
import { ProcessingStatus } from "../infrastructure/config";

const COMPREHENSION_WEIGHTS: Record<string, number> = {
  EASY: 1,
  LEARNING: 0.7,
  HARD: 0.3,
};
const MAX_PERCENT = 100;

export interface DashboardVideo {
  id: string;
  title: string;
  thumbnailPath: string;
  createdAt: Date;
  views: number;
  targetLang: string;
  status: string;
  statusLabel: string;
  progressStage: string;
  processingPercent: number;
  watchPercent: number;
  watchSeconds: number;
  watchDuration: number;
  comprehensionPercent: number | null;
}

export function isContinueWatching(video: DashboardVideo): boolean {
  return (
    video.status === ProcessingStatus.COMPLETED &&
    video.watchPercent > 0 &&
    video.watchPercent < MAX_PERCENT
  );
}

export interface FeaturedVideoResult {
  featuredVideo: DashboardVideo | null;
  continueWatching: DashboardVideo | null;
}

export function pickFeaturedVideo(
  videos: DashboardVideo[],
): FeaturedVideoResult {
  let firstCompleted: DashboardVideo | null = null;

  for (const videoItem of videos) {
    if (isContinueWatching(videoItem)) {
      return { featuredVideo: videoItem, continueWatching: videoItem };
    }
    if (!firstCompleted && videoItem.status === ProcessingStatus.COMPLETED) {
      firstCompleted = videoItem;
    }
  }

  return {
    featuredVideo: firstCompleted ?? videos[0] ?? null,
    continueWatching: null,
  };
}

export function computeComprehensionPercent(
  vttJson: DbVttSegment[] | null,
): number | null {
  if (!vttJson || vttJson.length === 0) {
    return null;
  }

  const weightedScore = vttJson.reduce((sum, segment) => {
    if (!segment.classification) {
      return sum + COMPREHENSION_WEIGHTS.LEARNING;
    }

    return (
      sum +
      (COMPREHENSION_WEIGHTS[segment.classification] ??
        COMPREHENSION_WEIGHTS.LEARNING)
    );
  }, 0);

  return Math.round((weightedScore / vttJson.length) * MAX_PERCENT);
}

export function getDashboardStatusLabel(
  status: string | null,
  watchPercent: number,
): string {
  if (status === ProcessingStatus.ERROR) {
    return "Needs Attention";
  }

  if (status !== ProcessingStatus.COMPLETED) {
    return "Processing";
  }

  if (watchPercent > 0 && watchPercent < MAX_PERCENT) {
    return "Continue Watching";
  }

  return "Ready";
}
