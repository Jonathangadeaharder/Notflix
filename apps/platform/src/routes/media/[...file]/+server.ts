import { error } from "@sveltejs/kit";
import path from "path";
import fs from "fs";
import { CONFIG } from "$lib/server/infrastructure/config";
import type { RequestHandler } from "./$types";
import { HTTP_STATUS } from "$lib/constants";
import { isPathWithinRoot } from "$lib/server/utils/path-utils";

export const GET: RequestHandler = async ({ params }) => {
  const filePath = params.file;
  if (!filePath) throw error(HTTP_STATUS.BAD_REQUEST, "Missing file path");

  // The filePath from params is relative to the 'media' root in URLs
  // e.g. /media/uploads/123.mp4 -> params.file = "uploads/123.mp4"

  const mediaRoot = CONFIG.MEDIA_ROOT;
  const fullPath = path.resolve(mediaRoot, filePath);

  // Security: Ensure the resolved path is still within the media root
  if (!isPathWithinRoot(fullPath, mediaRoot)) {
    throw error(HTTP_STATUS.FORBIDDEN, "Forbidden");
  }

  if (!fs.existsSync(fullPath)) {
    throw error(HTTP_STATUS.NOT_FOUND, "File not found");
  }

  const stat = fs.statSync(fullPath);
  const fileStream = fs.createReadStream(fullPath);

  // Basic content type detection
  const ext = path.extname(fullPath).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  const contentType = contentTypeMap[ext] || "application/octet-stream";

  // @ts-expect-error - ReadableStream type mismatch in some environments
  return new Response(fileStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": stat.size.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
};
