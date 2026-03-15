import path from "path";
import process from "node:process";
import { toPosixPath, toRelativePathFromRoot } from "../utils/path-utils";

const env = process.env;

const DEFAULT_UPLOAD_DIR = "media/uploads";
const uploadDir = env.UPLOAD_DIR || DEFAULT_UPLOAD_DIR;

// Detect if running inside Docker container
const isDocker = env.RUNNING_IN_DOCKER === "true";

// For Docker: UPLOAD_DIR is already absolute (/app/media/uploads)
// For Local: Resolve relative to project root
function resolveUploadDir(currentUploadDir: string): string {
  if (
    isDocker ||
    currentUploadDir.startsWith("/") ||
    currentUploadDir.includes(":")
  ) {
    return currentUploadDir;
  }
  return path.resolve(process.cwd(), "../../", currentUploadDir);
}

const resolvedUploadDir = resolveUploadDir(uploadDir);
const mediaRoot = path.resolve(resolvedUploadDir, "..");
const logsDir = env.LOGS_DIR || path.resolve(mediaRoot, "../logs");

export const CONFIG = {
  DATABASE_URL:
    env.DATABASE_URL || "postgres://admin:password@127.0.0.1:5432/main_db",
  AI_SERVICE_URL: env.AI_SERVICE_URL || "http://127.0.0.1:8000",
  AI_SERVICE_API_KEY: env.AI_SERVICE_API_KEY || "dev_secret_key",
  UPLOAD_DIR: uploadDir,
  RESOLVED_UPLOAD_DIR: resolvedUploadDir,
  MEDIA_ROOT: mediaRoot,
  LOGS_DIR: logsDir,
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
 * Converts a stored media path to the platform's canonical AI-service input.
 * Paths under the shared media root are sent as media-root-relative paths
 * (for example `uploads/example.mp4`) so both platform and AI service can
 * resolve them consistently across local and Docker environments.
 */
export function toAiServicePath(localPath: string): string {
  if (!localPath) {
    return localPath;
  }

  if (!path.isAbsolute(localPath)) {
    return toPosixPath(localPath);
  }

  const relativePath = toRelativePathFromRoot(localPath, CONFIG.MEDIA_ROOT);
  return relativePath ?? localPath;
}
