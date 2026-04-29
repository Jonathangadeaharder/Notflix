import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { z } from 'zod';
import { LIMITS } from '$lib/constants';
import type { NewVideo } from '$lib/server/db/schema';
import type { User } from '$lib/server/infrastructure/auth';
import { eventBus } from '$lib/server/infrastructure/event-bus';
import type { LanguageCode } from '$lib/types';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const MIN_LANG_LEN = 2;
const MAX_LANG_LEN = 5;
const FALLBACK_FILE_EXTENSION = '.bin';
const PLACEHOLDER_THUMBNAIL = '/placeholder.jpg';
const DEFAULT_MAX_FILE_SIZE_MB = 500;
const DEFAULT_MAX_FILE_SIZE_BYTES = DEFAULT_MAX_FILE_SIZE_MB * BYTES_PER_MB;
const ALLOWED_EXTENSIONS = new Set([
  'mp4',
  'mp3',
  'wav',
  'webm',
  'ogg',
  'm4a',
  'aac',
  'mkv',
  'avi',
  'mov',
]);

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(LIMITS.MAX_TITLE_LENGTH),
  targetLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).default('es'),
});

type UploadErrors = {
  title?: string[];
  targetLang?: string[];
  file?: string[];
};

type UploadPayload = {
  title: string;
  targetLang: string;
  file: File | null;
};

type UploadFailure = {
  errors: UploadErrors;
  data: {
    title: string;
    targetLang: string;
  };
};

type UploadSuccess = {
  videoId: string;
  targetLang: string;
};

type UploadResult =
  | { ok: true; value: UploadSuccess }
  | { ok: false; value: UploadFailure };

type UploadDependencies = {
  uploadDir: string;
  defaultNativeLang: string;
  maxFileSizeBytes?: number;
  createVideoId: () => string;
  saveFileToStorage: (file: File, filePath: string) => Promise<void>;
  insertVideo: (record: NewVideo) => Promise<unknown>;
  queueProcessingEvent: (opts: {
    videoId: string;
    targetLang: string;
    nativeLang: string;
    userId: string;
  }) => Promise<unknown>;
};

const defaultDependencies: UploadDependencies = {
  uploadDir: '',
  defaultNativeLang: 'en',
  createVideoId: () => crypto.randomUUID(),
  saveFileToStorage: saveUploadedFileToDisk,
  insertVideo: async () => undefined,
  queueProcessingEvent: async (opts) => {
    eventBus
      .emitAsync('video.processing.started', {
        videoId: opts.videoId,
        targetLang: opts.targetLang as LanguageCode,
        nativeLang: opts.nativeLang as LanguageCode,
        userId: opts.userId,
      })
      .catch((err) =>
        console.error(`[Pipeline] Background error for ${opts.videoId}:`, err),
      );
  },
};

export async function handleVideoUpload(
  payload: UploadPayload,
  user: User,
  overrides: Partial<UploadDependencies>,
): Promise<UploadResult> {
  const dependencies = { ...defaultDependencies, ...overrides };
  const validation = validateUploadPayload(
    payload,
    dependencies.maxFileSizeBytes,
  );
  if (!validation.ok) {
    return validation;
  }

  const videoId = dependencies.createVideoId();
  const filePath = buildUploadFilePath(
    dependencies.uploadDir,
    videoId,
    validation.data.file.name,
  );

  await dependencies.saveFileToStorage(validation.data.file, filePath);

  await dependencies.insertVideo({
    id: videoId,
    title: validation.data.title,
    filePath,
    thumbnailPath: PLACEHOLDER_THUMBNAIL,
    published: true,
    views: 0,
  });

  dependencies.queueProcessingEvent({
    videoId,
    targetLang: validation.data.targetLang,
    nativeLang: user.nativeLang || dependencies.defaultNativeLang,
    userId: user.id,
  });

  return {
    ok: true,
    value: {
      videoId,
      targetLang: validation.data.targetLang,
    },
  };
}

async function saveUploadedFileToDisk(
  file: File,
  filePath: string,
): Promise<void> {
  const targetDir = dirname(filePath);
  await mkdir(targetDir, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));
}

const FILE_TYPE_NOT_ALLOWED_MSG = `File type not allowed. Accepted: ${[...ALLOWED_EXTENSIONS].join(', ')}`;

function makeValidationFailure(
  errors: UploadErrors,
  title: string,
  targetLang: string,
): { ok: false; value: UploadFailure } {
  return {
    ok: false,
    value: { errors, data: { title, targetLang } },
  };
}

function extractFileExtension(filename: string): string | null {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0
    ? filename.slice(lastDotIndex + 1).toLowerCase()
    : null;
}

type SchemaResult = ReturnType<typeof uploadSchema.safeParse>;

function validateSchemaAndFile(
  payload: UploadPayload,
  parsed: SchemaResult,
): { ok: false; value: UploadFailure } | null {
  if (parsed.success && payload.file && payload.file.size !== 0) return null;
  const fieldErrors = parsed.success ? {} : parsed.error.flatten().fieldErrors;
  const fileErrors =
    !payload.file || payload.file.size === 0 ? ['File is required'] : undefined;
  return makeValidationFailure(
    { ...fieldErrors, file: fileErrors },
    payload.title,
    payload.targetLang,
  );
}

function validateFileSize(
  file: File,
  maxFileSizeBytes: number | undefined,
  parsed: SchemaResult,
): { ok: false; value: UploadFailure } | null {
  if (!parsed.success) return null;
  const maxFileSize = maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  if (file.size <= maxFileSize) return null;
  return makeValidationFailure(
    {
      file: [`File exceeds maximum size of ${maxFileSize / BYTES_PER_MB}MB`],
    },
    parsed.data.title,
    parsed.data.targetLang,
  );
}

function validateFileType(
  file: File,
  parsed: SchemaResult,
): { ok: false; value: UploadFailure } | null {
  if (!parsed.success) return null;
  const ext = extractFileExtension(file.name);
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return null;
  return makeValidationFailure(
    { file: [FILE_TYPE_NOT_ALLOWED_MSG] },
    parsed.data.title,
    parsed.data.targetLang,
  );
}

function validateUploadPayload(
  payload: UploadPayload,
  maxFileSizeBytes?: number,
):
  | { ok: true; data: { title: string; targetLang: string; file: File } }
  | { ok: false; value: UploadFailure } {
  const parsed = uploadSchema.safeParse({
    title: payload.title,
    targetLang: payload.targetLang,
  });

  const schemaFailure = validateSchemaAndFile(payload, parsed);
  if (schemaFailure) return schemaFailure;

  if (!parsed.success || !payload.file) {
    return makeValidationFailure(
      { file: ['File is required'] },
      payload.title,
      payload.targetLang,
    );
  }
  const file = payload.file;

  const sizeFailure = validateFileSize(file, maxFileSizeBytes, parsed);
  if (sizeFailure) return sizeFailure;

  const typeFailure = validateFileType(file, parsed);
  if (typeFailure) return typeFailure;

  return {
    ok: true,
    data: {
      title: parsed.data.title,
      targetLang: parsed.data.targetLang,
      file,
    },
  };
}

function buildUploadFilePath(
  uploadDir: string,
  videoId: string,
  originalFileName: string,
): string {
  const fileExtension = extname(originalFileName) || FALLBACK_FILE_EXTENSION;
  return join(uploadDir, `${videoId}${fileExtension}`);
}
