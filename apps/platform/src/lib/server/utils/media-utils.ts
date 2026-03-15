import path from "path";
import { CONFIG } from "../infrastructure/config";
import { toPosixPath, toRelativePathFromRoot } from "./path-utils";

/**
 * Converts an absolute filesystem path to a relative URL for the media proxy.
 * e.g. "E:/project/media/uploads/video.mp4" -> "/media/uploads/video.mp4"
 */
export function toMediaUrl(absolutePath: string | null | undefined): string {
  if (!absolutePath) return "";
  if (
    absolutePath.startsWith("http://") ||
    absolutePath.startsWith("https://")
  ) {
    return absolutePath;
  }

  if (path.isAbsolute(absolutePath)) {
    const relativePath = toRelativePathFromRoot(
      absolutePath,
      CONFIG.MEDIA_ROOT,
    );
    if (relativePath) {
      return `/media/${relativePath}`;
    }
  }

  if (absolutePath.startsWith("/")) {
    return absolutePath;
  }

  return `/media/${toPosixPath(absolutePath).replace(/^\/+/, "")}`;
}
