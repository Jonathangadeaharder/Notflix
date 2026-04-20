import { error } from "@sveltejs/kit";
import path from "path";
import fs from "fs";
import { CONFIG } from "$lib/server/infrastructure/config";
import {
  resolveMediaPath,
  MediaPathError,
} from "$lib/server/utils/media-path-security";
import type { RequestHandler } from "./$types";
import { HTTP_STATUS } from "$lib/constants";

export const GET: RequestHandler = async ({ params }) => {
  const mediaRoot = path.resolve(CONFIG.RESOLVED_UPLOAD_DIR, "..");

  let resolved: { fullPath: string; contentType: string };
  try {
    resolved = resolveMediaPath(params.file, mediaRoot);
  } catch (err) {
    if (err instanceof MediaPathError) {
      throw error(err.statusCode, err.message);
    }
    throw error(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Internal error");
  }

  if (!fs.existsSync(resolved.fullPath)) {
    throw error(HTTP_STATUS.NOT_FOUND, "File not found");
  }

  const stat = fs.statSync(resolved.fullPath);
  const fileStream = fs.createReadStream(resolved.fullPath);

  // @ts-expect-error - ReadableStream type mismatch in some environments
  return new Response(fileStream, {
    headers: {
      "Content-Type": resolved.contentType,
      "Content-Length": stat.size.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
};
