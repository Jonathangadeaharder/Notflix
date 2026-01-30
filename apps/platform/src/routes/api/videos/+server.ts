import { db } from "$lib/server/infrastructure/database";
import { video, videoProcessing } from "@notflix/database";
import { eq } from "drizzle-orm";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const videos = await db
    .select({
      id: video.id,
      status: videoProcessing.status,
    })
    .from(video)
    .leftJoin(videoProcessing, eq(video.id, videoProcessing.videoId));

  return json({ videos });
};
