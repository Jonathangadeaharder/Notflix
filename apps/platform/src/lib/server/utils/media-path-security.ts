import path from "path";

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export interface ResolvedMediaPath {
  fullPath: string;
  contentType: string;
}

export class MediaPathError extends Error {
  public readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function resolveMediaPath(
  filePath: string | undefined,
  mediaRoot: string,
): ResolvedMediaPath {
  if (!filePath) {
    throw new MediaPathError(400, "Missing file path");
  }

  const fullPath = path.join(mediaRoot, filePath);

  // Security: Ensure the resolved path is still within the media root
  if (!fullPath.startsWith(mediaRoot)) {
    throw new MediaPathError(403, "Forbidden");
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = CONTENT_TYPE_MAP[ext] || DEFAULT_CONTENT_TYPE;

  return { fullPath, contentType };
}
