import { env } from '$env/dynamic/private';
import path from 'path';

const uploadDir = env.UPLOAD_DIR || 'media/uploads';
// If it's not absolute (starts with / or has : on Windows), make it absolute relative to project root
const resolvedUploadDir = (uploadDir.startsWith('/') || uploadDir.includes(':')) 
    ? uploadDir 
    : path.resolve(process.cwd(), '../../', uploadDir);

export const CONFIG = {
    DATABASE_URL: env.DATABASE_URL || 'postgres://admin:password@localhost:5432/main_db',
    AI_SERVICE_URL: env.AI_SERVICE_URL || 'http://localhost:8000',
    AI_SERVICE_API_KEY: env.AI_SERVICE_API_KEY || 'dev_secret_key',
    UPLOAD_DIR: uploadDir,
    RESOLVED_UPLOAD_DIR: resolvedUploadDir,
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