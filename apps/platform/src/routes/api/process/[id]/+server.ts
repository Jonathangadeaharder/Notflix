import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { processVideo } from "$lib/server/services/video-pipeline";

const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const HTTP_STATUS_UNAUTHORIZED = 401;

interface ProcessRequest {
  targetLang?: string;
  nativeLang?: string;
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS_UNAUTHORIZED },
    );
  }

  const videoId = params.id;
  if (!videoId) {
    return json(
      { error: "Missing videoId" },
      { status: HTTP_STATUS_BAD_REQUEST },
    );
  }

  try {
    const body = (await request.json()) as ProcessRequest;

    processVideo({
      videoId,
      targetLang: body.targetLang || "es",
      nativeLang: body.nativeLang || "en",
      userId: session.user.id,
    }).catch((err) =>
      console.error(`[Pipeline] Background error for ${videoId}:`, err),
    );

    return json({ success: true, message: "Processing started in background" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Processing API Error:", message);
    return json(
      { error: message },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR },
    );
  }
};
