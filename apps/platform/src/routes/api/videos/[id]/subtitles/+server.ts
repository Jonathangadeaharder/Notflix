import { buildSubtitleResponseWithDefaults } from "$lib/server/services/subtitle-delivery.service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  return buildSubtitleResponseWithDefaults(
    params.id,
    url.searchParams.get("mode"),
  );
};
