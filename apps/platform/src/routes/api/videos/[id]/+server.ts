import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { deleteVideoAndAssets } from "$lib/server/services/delete-video.service";
import { HTTP_STATUS } from "$lib/constants";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  const result = await deleteVideoAndAssets(params.id);

  if (!result.ok) {
    return json(
      { error: "Video not found" },
      { status: HTTP_STATUS.NOT_FOUND },
    );
  }

  return json({ success: true });
};
