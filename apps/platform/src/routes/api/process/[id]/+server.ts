import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { startVideoProcessingWithDefaults } from "$lib/server/services/process-video-request.service";
import { HTTP_STATUS } from "$lib/constants";

interface ProcessRequest {
  targetLang?: string;
  nativeLang?: string;
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  const videoId = params.id;
  if (!videoId) {
    return json(
      { error: "Missing videoId" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  try {
    const body = (await request.json()) as ProcessRequest;
    startVideoProcessingWithDefaults({
      videoId,
      userId: session.user.id,
      targetLang: body.targetLang,
      nativeLang: body.nativeLang,
    });
    return json({ success: true, message: "Processing started in background" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Processing API Error:", message);
    return json(
      { error: message },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
};
