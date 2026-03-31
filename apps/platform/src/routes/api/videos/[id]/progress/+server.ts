import { json, type RequestEvent } from "@sveltejs/kit";
import { videoProcessing, watchProgress } from "@notflix/database";
import { and, eq } from "drizzle-orm";
import { db } from "$lib/server/infrastructure/database";
import { CONFIG, ProcessingStatus } from "$lib/server/infrastructure/config";
import { HTTP_STATUS } from "$lib/constants";

const MAX_PROGRESS_PERCENT = 100;

function clampProgressPercent(progressPercent: number): number {
  return Math.max(
    0,
    Math.min(MAX_PROGRESS_PERCENT, Math.round(progressPercent)),
  );
}

export const GET = async ({ params, locals }: RequestEvent) => {
  const session = await locals.auth();
  if (!session) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  if (!params.id) {
    return json(
      { error: "Video not found" },
      { status: HTTP_STATUS.NOT_FOUND },
    );
  }

  const [processing] = await db
    .select({
      status: videoProcessing.status,
      progressStage: videoProcessing.progressStage,
      progressPercent: videoProcessing.progressPercent,
    })
    .from(videoProcessing)
    .where(
      and(
        eq(videoProcessing.videoId, params.id),
        eq(videoProcessing.targetLang, CONFIG.DEFAULT_TARGET_LANG),
      ),
    )
    .limit(1);

  const [progress] = await db
    .select({
      currentTime: watchProgress.currentTime,
      duration: watchProgress.duration,
      progressPercent: watchProgress.progressPercent,
      updatedAt: watchProgress.updatedAt,
    })
    .from(watchProgress)
    .where(
      and(
        eq(watchProgress.userId, session.user.id),
        eq(watchProgress.videoId, params.id),
      ),
    )
    .limit(1);

  return json({
    status: processing?.status ?? ProcessingStatus.PENDING,
    progressStage: processing?.progressStage ?? "QUEUED",
    progressPercent: processing?.progressPercent ?? 0,
    watchProgress: progress ?? null,
  });
};

// eslint-disable-next-line max-lines-per-function
export const POST = async ({ params, request, locals }: RequestEvent) => {
  const session = await locals.auth();
  if (!session) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  if (!params.id) {
    return json(
      { error: "Video not found" },
      { status: HTTP_STATUS.NOT_FOUND },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const currentTime = Number(body.currentTime ?? 0);
  const duration = Number(body.duration ?? 0);
  const progressPercent = clampProgressPercent(
    Number(body.progressPercent ?? 0),
  );

  if (
    Number.isNaN(currentTime) ||
    Number.isNaN(duration) ||
    Number.isNaN(progressPercent)
  ) {
    return json(
      { error: "Invalid progress payload" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  await db
    .insert(watchProgress)
    .values({
      userId: session.user.id,
      videoId: params.id,
      currentTime: Math.max(0, Math.round(currentTime)),
      duration: Math.max(0, Math.round(duration)),
      progressPercent,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [watchProgress.userId, watchProgress.videoId],
      set: {
        currentTime: Math.max(0, Math.round(currentTime)),
        duration: Math.max(0, Math.round(duration)),
        progressPercent,
        updatedAt: new Date(),
      },
    });

  return json({ success: true });
};
