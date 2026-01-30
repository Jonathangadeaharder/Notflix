import { env } from "$env/dynamic/private";
import path from "path";

const getEnv = (key: string, fallback?: string) => {
  return process.env[key] ?? env[key] ?? fallback;
};

const uploadDir = getEnv("UPLOAD_DIR", "media/uploads") as string;

// Detect if running inside Docker container
const isDocker = getEnv("RUNNING_IN_DOCKER") === "true";

// For Docker: UPLOAD_DIR is already absolute (/app/media/uploads)
// For Local: Resolve relative to project root
const resolvedUploadDir = isDocker
  ? uploadDir
  : uploadDir.startsWith("/") || uploadDir.includes(":")
    ? uploadDir
    : path.resolve(process.cwd(), "../../", uploadDir);

// Path to use when calling AI Service
// In Docker: Both services share /app/media mount, so use that path
// Local + Docker AI: Need to translate host path to container path
const aiServiceMediaPrefix = isDocker
  ? "/app/media/uploads"
  : "/app/media/uploads"; // AI Service always expects Docker paths

export const CONFIG = {
  DATABASE_URL: getEnv(
    "DATABASE_URL",
    "postgres://admin:password@localhost:5432/main_db",
  ) as string,
  AI_SERVICE_URL: getEnv("AI_SERVICE_URL", "http://127.0.0.1:8000") as string,
  AI_SERVICE_API_KEY: getEnv("AI_SERVICE_API_KEY", "dev_secret_key") as string,
  UPLOAD_DIR: uploadDir,
  RESOLVED_UPLOAD_DIR: resolvedUploadDir,
  AI_SERVICE_MEDIA_PREFIX: aiServiceMediaPrefix,
  IS_DOCKER: isDocker,
  DEFAULT_TARGET_LANG: "es",
  DEFAULT_NATIVE_LANG: "en",
  MODEL_SIZE: "tiny",
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
  const mediaRootInternal = getEnv(
    "MEDIA_ROOT_INTERNAL",
    "/app/media/uploads",
  ) as string;

  // Simple, robust concatenation. No magic OS detection.
  return `${mediaRootInternal}/${filename}`;
}
