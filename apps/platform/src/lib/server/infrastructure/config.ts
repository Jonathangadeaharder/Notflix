import path from "path";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore SvelteKit virtual module not resolvable outside Vite context
import { env } from "$env/dynamic/private";

// The AI service container always mounts media at this path, regardless of host layout.
const AI_MEDIA_PATH = "/app/media/uploads";

const uploadDir = env.UPLOAD_DIR || "media/uploads";

// Detect if running inside Docker container
const isDocker = env.RUNNING_IN_DOCKER === "true";

function resolveUploadDir(dir: string, docker: boolean): string {
  if (docker) return dir;
  const isAbsolute = dir.startsWith("/") || dir.includes(":");
  return isAbsolute ? dir : path.resolve(process.cwd(), "../../", dir);
}

const resolvedUploadDir = resolveUploadDir(uploadDir, isDocker);

export const CONFIG = {
  get DATABASE_URL() {
    return (
      process.env.DATABASE_URL ||
      env.DATABASE_URL ||
      "postgres://admin:password@localhost:5432/main_db"
    );
  },
  AI_SERVICE_URL: env.AI_SERVICE_URL || "http://127.0.0.1:8000",
  AI_SERVICE_API_KEY: env.AI_SERVICE_API_KEY || "dev_secret_key",
  UPLOAD_DIR: uploadDir,
  RESOLVED_UPLOAD_DIR: resolvedUploadDir,
  MEDIA_ROOT: resolvedUploadDir,
  AI_SERVICE_MEDIA_PREFIX: AI_MEDIA_PATH,
  IS_DOCKER: isDocker,
  DEFAULT_TARGET_LANG: "es",
  DEFAULT_NATIVE_LANG: "en",
  MODEL_SIZE: "tiny",
  STORAGE_TYPE: env.STORAGE_TYPE || "local", // local | s3
};

export enum ProcessingStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  ERROR = "ERROR",
}

/**
 * Converts a local file path to a path that the AI Service can understand.
 * Relies on MEDIA_ROOT_INTERNAL env var to be consistent across services.
 */
export function toAiServicePath(localPath: string): string {
  const filename = path.basename(localPath);
  // Default to the standard Docker internal path if env var not set
  const mediaRootInternal = env.MEDIA_ROOT_INTERNAL || AI_MEDIA_PATH;

  // Simple, robust concatenation. No magic OS detection.
  return `${mediaRootInternal}/${filename}`;
}
