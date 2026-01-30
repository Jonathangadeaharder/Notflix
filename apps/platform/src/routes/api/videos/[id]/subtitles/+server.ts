import { error } from "@sveltejs/kit";
import { subtitleService } from "$lib/server/infrastructure/container";
import type { RequestHandler } from "./$types";
import { HTTP_STATUS } from "$lib/constants";

export const GET: RequestHandler = async ({ params, url }) => {
  const mode = url.searchParams.get("mode") || "native";
  const videoId = params.id;

  if (!videoId) {
    throw error(HTTP_STATUS.BAD_REQUEST, "Video ID is required");
  }

  try {
    const vttContent = await subtitleService.generateVtt(
      videoId,
      mode as unknown as Parameters<typeof subtitleService.generateVtt>[1],
    );
    return new Response(vttContent, {
      headers: {
        "Content-Type": "text/vtt",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error(e);
    throw error(HTTP_STATUS.NOT_FOUND, "Subtitles not found");
  }
};
