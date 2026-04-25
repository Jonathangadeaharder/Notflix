import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  SubtitleService,
  type SubtitleMode,
} from "$lib/server/services/subtitle.service";
import { HTTP_STATUS } from "$lib/constants";

const VALID_MODES: Set<SubtitleMode> = new Set([
  "native",
  "translated",
  "bilingual",
]);

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const mode = url.searchParams.get("mode") || "native";
  const videoId = params.id;

  if (!videoId) {
    throw error(HTTP_STATUS.BAD_REQUEST, "Video ID is required");
  }

  if (!VALID_MODES.has(mode as SubtitleMode)) {
    throw error(
      HTTP_STATUS.BAD_REQUEST,
      `Invalid mode: ${mode}. Must be one of: native, translated, bilingual`,
    );
  }

  try {
    const subtitleService = new SubtitleService(locals.db);
    const vttContent = await subtitleService.generateVtt(
      videoId,
      mode as SubtitleMode,
    );

    if (!vttContent) {
      throw error(HTTP_STATUS.NOT_FOUND, "Subtitles not found");
    }

    return new Response(vttContent, {
      headers: {
        "Content-Type": "text/vtt",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    if (e && typeof e === "object" && "status" in e) throw e;
    console.error(e);
    throw error(HTTP_STATUS.NOT_FOUND, "Subtitles not found");
  }
};
