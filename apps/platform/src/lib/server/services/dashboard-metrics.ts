import type { DbVttSegment } from "$lib/server/db/schema";
import { ProcessingStatus } from "../infrastructure/config";

const COMPREHENSION_WEIGHTS: Record<string, number> = {
  EASY: 1,
  LEARNING: 0.7,
  HARD: 0.3,
};
const MAX_PERCENT = 100;

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
