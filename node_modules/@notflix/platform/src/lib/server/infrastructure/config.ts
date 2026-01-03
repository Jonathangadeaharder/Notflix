import { env } from '$env/dynamic/private';
import path from 'path';

const uploadDir = env.UPLOAD_DIR || 'media/uploads';

// Detect if running inside Docker container
const isDocker = env.RUNNING_IN_DOCKER === 'true';

// For Docker: UPLOAD_DIR is already absolute (/app/media/uploads)
// For Local: Resolve relative to project root
const resolvedUploadDir = isDocker
    ? uploadDir
    : (uploadDir.startsWith('/') || uploadDir.includes(':'))
        ? uploadDir
        : path.resolve(process.cwd(), '../../', uploadDir);

// Path to use when calling AI Service
// In Docker: Both services share /app/media mount, so use that path
// Local + Docker AI: Need to translate host path to container path
const aiServiceMediaPrefix = isDocker
    ? '/app/media/uploads'
    : '/app/media/uploads'; // AI Service always expects Docker paths

export const CONFIG = {
    DATABASE_URL: env.DATABASE_URL || 'postgres://admin:password@localhost:5432/main_db',
    AI_SERVICE_URL: env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
    AI_SERVICE_API_KEY: env.AI_SERVICE_API_KEY || 'dev_secret_key',
    UPLOAD_DIR: uploadDir,
    RESOLVED_UPLOAD_DIR: resolvedUploadDir,
    AI_SERVICE_MEDIA_PREFIX: aiServiceMediaPrefix,
    IS_DOCKER: isDocker,
    DEFAULT_TARGET_LANG: 'es',
    DEFAULT_NATIVE_LANG: 'en',
    MODEL_SIZE: 'tiny',
    STORAGE_TYPE: env.STORAGE_TYPE || 'local' // local | s3
};

export enum ProcessingStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR'
}

/**
 * Converts a local file path to a path that the AI Service can understand.
 * When running locally, translates Windows/Mac paths to Docker container paths.
 */
export function toAiServicePath(localPath: string): string {
    if (CONFIG.IS_DOCKER) {
        // Both services in Docker - path is already correct
        return localPath;
    }

    // Extract filename from the local path
    const filename = path.basename(localPath);

    // Return path as AI Service (in Docker) expects it
    return `${CONFIG.AI_SERVICE_MEDIA_PREFIX}/${filename}`;
}