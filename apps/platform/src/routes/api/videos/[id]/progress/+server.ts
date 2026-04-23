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

  const session = await locals.auth();
  if (!session?.user) {
    return {
      errorResponse: json(
        { error: "Unauthorized" },
        { status: HTTP_STATUS.UNAUTHORIZED },
      ),
    };
  }
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

  const body = await parseProgressBody(request);
  if ("errorResponse" in body) return body.errorResponse;

  await db
    .insert(watchProgress)
    .values({
      userId: session.user.id,
      videoId: id,
      currentTime: Math.max(0, Math.round(body.currentTime)),
      duration: Math.max(0, Math.round(body.duration)),
      progressPercent: body.progressPercent,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [watchProgress.userId, watchProgress.videoId],
      set: {
        currentTime: Math.max(0, Math.round(body.currentTime)),
        duration: Math.max(0, Math.round(body.duration)),
        progressPercent: body.progressPercent,
        updatedAt: new Date(),
      },
    });

  return json({ success: true });
};

async function parseProgressBody(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return {
      errorResponse: json(
        { error: "Invalid JSON" },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
  }

  if (!body || typeof body !== "object") {
    return {
      errorResponse: json(
        { error: "Invalid JSON body" },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
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
    !Number.isFinite(currentTime) ||
    !Number.isFinite(duration) ||
    !Number.isFinite(progressPercent)
  ) {
    return {
      errorResponse: json(
        { error: "Invalid progress payload" },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
  }

  return { currentTime, duration, progressPercent };
}
