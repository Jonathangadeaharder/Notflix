import type { NewVideo } from "$lib/server/db/schema";
import { LIMITS } from "$lib/constants";
import type { User } from "$lib/server/infrastructure/auth";
import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { dirname, extname, join } from "path";
import { z } from "zod";

const MIN_LANG_LEN = 2;
const MAX_LANG_LEN = 5;
const FALLBACK_FILE_EXTENSION = ".bin";
const PLACEHOLDER_THUMBNAIL = "/placeholder.jpg";
const DEFAULT_MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "mp4",
  "mp3",
  "wav",
  "webm",
  "ogg",
  "m4a",
  "aac",
  "mkv",
  "avi",
  "mov",
]);

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(LIMITS.MAX_TITLE_LENGTH),
  targetLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).default("es"),
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
  queueTask: (name: string, task: Promise<unknown>) => void;
  processVideo: (opts: {
    videoId: string;
    targetLang: string;
    nativeLang: string;
    userId: string;
  }) => Promise<unknown>;
};

const defaultDependencies: UploadDependencies = {
  uploadDir: "",
  defaultNativeLang: "en",
  createVideoId: () => crypto.randomUUID(),
  saveFileToStorage: saveUploadedFileToDisk,
  insertVideo: async () => undefined,
  queueTask: () => undefined,
  processVideo: async () => undefined,
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

  dependencies.queueTask(
    `processVideo:${videoId}`,
    dependencies.processVideo({
      videoId,
      targetLang: validation.data.targetLang,
      nativeLang: user.nativeLang || dependencies.defaultNativeLang,
      userId: user.id,
    }),
  );

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

  if (!parsed.success || !payload.file || payload.file.size === 0) {
    const fieldErrors = parsed.success
      ? {}
      : parsed.error.flatten().fieldErrors;
    const fileErrors =
      !payload.file || payload.file.size === 0
        ? ["File is required"]
        : undefined;

    return {
      ok: false,
      value: {
        errors: {
          ...fieldErrors,
          file: fileErrors,
        },
        data: {
          title: payload.title,
          targetLang: payload.targetLang,
        },
      },
    };
  }

  const maxFileSize = maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  if (payload.file.size > maxFileSize) {
    return {
      ok: false,
      value: {
        errors: {
          file: [
            `File exceeds maximum size of ${maxFileSize / (1024 * 1024)}MB`,
          ],
        },
        data: { title: parsed.data.title, targetLang: parsed.data.targetLang },
      },
    };
  }

  const filename = payload.file.name;
  const lastDotIndex = filename.lastIndexOf(".");
  const ext =
    lastDotIndex > 0 ? filename.slice(lastDotIndex + 1).toLowerCase() : null;
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      value: {
        errors: {
          file: [
            "File type not allowed. Accepted: " +
              [...ALLOWED_EXTENSIONS].join(", "),
          ],
        },
        data: { title: parsed.data.title, targetLang: parsed.data.targetLang },
      },
    };
  }

  return {
    ok: true,
    data: {
      title: parsed.data.title,
      targetLang: parsed.data.targetLang,
      file: payload.file,
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
