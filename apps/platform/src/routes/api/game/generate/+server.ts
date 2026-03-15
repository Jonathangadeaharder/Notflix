import { json } from "@sveltejs/kit";
import { generateDeck } from "$lib/server/services/chunker.service";
import { GAME } from "$lib/constants";
import type { RequestHandler } from "./$types";

const SECONDS_IN_MINUTE = 60;
const DEFAULT_END_TIME = GAME.DEFAULT_INTERVAL_MINUTES * SECONDS_IN_MINUTE;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_BAD_REQUEST = 400;

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS_UNAUTHORIZED },
    );
  }

  const userId = session.user.id;

  const videoId = url.searchParams.get("videoId");
  const start = parseInt(url.searchParams.get("start") || "0", 10);
  const end = parseInt(
    url.searchParams.get("end") || DEFAULT_END_TIME.toString(),
    10,
  );
  const targetLang = url.searchParams.get("targetLang") || "es";

  if (!videoId || Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return json(
      { error: "Invalid game request" },
      { status: HTTP_STATUS_BAD_REQUEST },
    );
  }

  const cards = await generateDeck(userId, videoId, start, end, targetLang);

  console.log(
    `[API] Generated ${cards.length} cards for video ${videoId} (chunk ${start}-${end}s)`,
  );

  return json({
    nextChunkStart: end,
    cards,
  });
};
