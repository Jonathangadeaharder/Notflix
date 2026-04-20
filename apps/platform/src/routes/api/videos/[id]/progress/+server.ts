import { json, type RequestEvent } from "@sveltejs/kit";
import { videoProcessing, watchProgress } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "$lib/server/infrastructure/database";
import { CONFIG, ProcessingStatus } from "$lib/server/infrastructure/config";
import { HTTP_STATUS } from "$lib/constants";
import { ProgressStage } from "$lib/types";

const MAX_PROGRESS_PERCENT = 100;

async function validateRequest(
  locals: RequestEvent["locals"],
  params: RequestEvent["params"],
) {
  if (!params.id) {
    return {
      errorResponse: json(
        { error: "Video not found" },
        { status: HTTP_STATUS.NOT_FOUND },
      ),
    };
  }

  const session = (await locals.auth())!;
  return { session, id: params.id as string };
}

export const GET = async ({ params, locals, url }: RequestEvent) => {
  const { session, id, errorResponse } = await validateRequest(locals, params);
  if (errorResponse) return errorResponse;

  const targetLang =
    url.searchParams.get("targetLang") || CONFIG.DEFAULT_TARGET_LANG;

  const [[processing], [progress]] = await Promise.all([
    db
      .select({
        status: videoProcessing.status,
        progressStage: videoProcessing.progressStage,
        progressPercent: videoProcessing.progressPercent,
      })
      .from(videoProcessing)
      .where(
        and(
          eq(videoProcessing.videoId, id),
          eq(videoProcessing.targetLang, targetLang),
        ),
      )
      .limit(1),
    db
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
          eq(watchProgress.videoId, id),
        ),
      )
      .limit(1),
  ]);

  return json({
    status: processing?.status ?? ProcessingStatus.PENDING,
    progressStage: processing?.progressStage ?? ProgressStage.QUEUED,
    progressPercent: processing?.progressPercent ?? 0,
    watchProgress: progress ?? null,
  });
};

export const POST = async ({ params, request, locals }: RequestEvent) => {
  const { session, id, errorResponse } = await validateRequest(locals, params);
  if (errorResponse) return errorResponse;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const currentTime = Number(body.currentTime ?? 0);
  const duration = Number(body.duration ?? 0);
  const progressPercent = Math.max(
    0,
    Math.min(
      MAX_PROGRESS_PERCENT,
      Math.round(Number(body.progressPercent ?? 0)),
    ),
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
      videoId: id,
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
