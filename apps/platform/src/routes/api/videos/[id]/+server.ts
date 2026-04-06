import { json } from "@sveltejs/kit";
import { deleteVideoAndAssets } from "$lib/server/services/delete-video.service";
import type { RequestHandler } from "./$types";
import { HTTP_STATUS } from "$lib/constants";

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.auth();
  if (!session) {
    return json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  const { id } = params;

  try {
    const result = await deleteVideoAndAssets(id);

    if (!result.ok) {
      if (result.reason === "NOT_FOUND") {
        return json(
          { error: "Video not found" },
          { status: HTTP_STATUS.NOT_FOUND },
        );
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error("[Delete] Operation failed:", err);
    return json(
      { error: "Failed to delete video" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
};
