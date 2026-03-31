import { createRequire } from "node:module";
import path from "path";

type EnvSource = Record<string, string | undefined>;
const requireEnv = createRequire(import.meta.url);

function loadPrivateEnv(): EnvSource {
  try {
    const { env } = requireEnv("$env/dynamic/private") as { env: EnvSource };
    return env;
  } catch {
    return process.env;
  }
}

const privateEnv = loadPrivateEnv();

// The AI service container always mounts media at this path, regardless of host layout.
const AI_MEDIA_PATH = "/app/media/uploads";

const uploadDir = privateEnv.UPLOAD_DIR ?? "media/uploads";

// Detect if running inside Docker container
const isDocker = privateEnv.RUNNING_IN_DOCKER === "true";

function resolveUploadDir(dir: string, docker: boolean): string {
  if (docker) return dir;
  const isAbsolute = dir.startsWith("/") || dir.includes(":");
  return isAbsolute ? dir : path.resolve(process.cwd(), "../../", dir);
}

const resolvedUploadDir = resolveUploadDir(uploadDir, isDocker);
const mediaRoot =
  privateEnv.MEDIA_ROOT ?? path.resolve(resolvedUploadDir, "..");
const mediaRootInternal = privateEnv.MEDIA_ROOT_INTERNAL ?? AI_MEDIA_PATH;

export const CONFIG = {
  DATABASE_URL:
    privateEnv.DATABASE_URL ??
    "postgres://admin:password@localhost:5432/main_db",
  AI_SERVICE_URL: privateEnv.AI_SERVICE_URL ?? "http://127.0.0.1:8000",
  AI_SERVICE_API_KEY: privateEnv.AI_SERVICE_API_KEY ?? "dev_secret_key",
  UPLOAD_DIR: uploadDir,
  RESOLVED_UPLOAD_DIR: resolvedUploadDir,
  MEDIA_ROOT: mediaRoot,
  AI_SERVICE_MEDIA_PREFIX: mediaRootInternal,
  IS_DOCKER: isDocker,
  DEFAULT_TARGET_LANG: "es",
  DEFAULT_NATIVE_LANG: "en",
  MODEL_SIZE: "tiny",
  STORAGE_TYPE: privateEnv.STORAGE_TYPE ?? "local", // local | s3
};

export enum ProcessingStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  ERROR = "ERROR",
}

/**
 * Converts a local file path to a media-root-relative path for the AI service.
 * Normalizes separators and strips any host-specific prefixes.
 */
export function toAiServicePath(localPath: string): string {
  const normalizedInput = localPath.replace(/\\/g, "/");
  const absolutePath = path.isAbsolute(normalizedInput)
    ? path.normalize(normalizedInput)
    : path.normalize(path.join(CONFIG.MEDIA_ROOT, normalizedInput));

  const relativePath = path.relative(CONFIG.MEDIA_ROOT, absolutePath);
  const normalizedRelative = relativePath.replace(/\\/g, "/");

  if (normalizedRelative.startsWith("..")) {
    return path.basename(absolutePath);
  }

  return normalizedRelative;
}
