import path from "path";

const CHUNK_OVERLAP_SECONDS = 0.5;
const MIN_CHUNK_DURATION_SECONDS = 1.0;
import { CONFIG } from "../infrastructure/config";

/**
 * Converts an absolute filesystem path to a relative URL for the media proxy.
 * e.g. "E:/project/media/uploads/video.mp4" -> "/media/uploads/video.mp4"
 */
export function toMediaUrl(absolutePath: string | null | undefined): string {
  if (!absolutePath) return "";
  if (absolutePath.startsWith("http") || absolutePath.startsWith("/media"))
    return absolutePath;

  const mediaRoot = path.resolve(CONFIG.RESOLVED_UPLOAD_DIR, "..");

  // Normalize paths for Windows/Linux comparison
  const normalizedAbs = path.normalize(absolutePath);
  const normalizedRoot = path.normalize(mediaRoot);

  if (normalizedAbs.startsWith(normalizedRoot)) {
    const relative = normalizedAbs.slice(normalizedRoot.length);
    // Ensure forward slashes for URLs, handling both OS styles safely
    return "/media" + relative.replace(/\\/g, "/");
  }

  return absolutePath;
}

export type ITimeSpan = { start: number; end: number };

export function calculateChunks(
  durationSeconds: number,
  maxChunkSize: number,
): ITimeSpan[] {
  if (durationSeconds <= 0 || maxChunkSize <= 0) return [];

  const chunks: ITimeSpan[] = [];
  let currentStart = 0;

  while (currentStart < durationSeconds) {
    const currentEnd = currentStart + maxChunkSize;
    if (currentEnd >= durationSeconds) {
      chunks.push({ start: currentStart, end: durationSeconds });
      break;
    }

    chunks.push({ start: currentStart, end: currentEnd });

    // Small overlap to prevent cutting off words
    currentStart = currentEnd - CHUNK_OVERLAP_SECONDS;
  }

  // Clean up last chunk if it's too small
  if (chunks.length > 1) {
    const last = chunks[chunks.length - 1];
    if (last.end - last.start < MIN_CHUNK_DURATION_SECONDS) {
      chunks.pop();
      chunks[chunks.length - 1].end = durationSeconds;
    }
  }

  return chunks;
}
