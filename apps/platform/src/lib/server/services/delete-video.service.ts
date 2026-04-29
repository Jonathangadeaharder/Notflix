import { unlink } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { video, videoProcessing } from '$lib/server/db/schema';
import { db as defaultDb } from '$lib/server/infrastructure/database';

type VideoRecord = {
  filePath: string;
  thumbnailPath: string | null;
};

type DeleteVideoDependencies = {
  getVideoById: (videoId: string) => Promise<VideoRecord | null>;
  deleteVideoProcessingById: (videoId: string) => Promise<unknown>;
  deleteVideoById: (videoId: string) => Promise<unknown>;
  deleteFile: (path: string) => Promise<void>;
};

type DeleteVideoResult = { ok: true } | { ok: false; reason: 'NOT_FOUND' };

const defaultDependencies: DeleteVideoDependencies = {
  getVideoById: async (videoId) => {
    const [record] = await defaultDb
      .select()
      .from(video)
      .where(eq(video.id, videoId))
      .limit(1);
    if (!record) {
      return null;
    }
    return {
      filePath: record.filePath,
      thumbnailPath: record.thumbnailPath,
    };
  },
  deleteVideoProcessingById: (videoId) =>
    defaultDb
      .delete(videoProcessing)
      .where(eq(videoProcessing.videoId, videoId)),
  deleteVideoById: (videoId) =>
    defaultDb.delete(video).where(eq(video.id, videoId)),
  deleteFile: (path) => unlink(path),
};

export async function deleteVideoAndAssets(
  videoId: string,
  overrides: Partial<DeleteVideoDependencies> = {},
): Promise<DeleteVideoResult> {
  const dependencies = { ...defaultDependencies, ...overrides };
  const videoRecord = await dependencies.getVideoById(videoId);
  if (!videoRecord) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  await dependencies.deleteVideoProcessingById(videoId);
  await dependencies.deleteVideoById(videoId);

  const deletionPromises: Promise<void>[] = [];
  if (videoRecord.filePath) {
    deletionPromises.push(
      safelyDeleteFile(videoRecord.filePath, dependencies.deleteFile),
    );
  }
  if (videoRecord.thumbnailPath) {
    deletionPromises.push(
      safelyDeleteFile(videoRecord.thumbnailPath, dependencies.deleteFile),
    );
  }
  await Promise.all(deletionPromises);

  return { ok: true };
}

async function safelyDeleteFile(
  path: string,
  deleteFile: (path: string) => Promise<void>,
): Promise<void> {
  try {
    await deleteFile(path);
    console.log(`[Delete] Removed file: ${path}`);
  } catch (error) {
    console.warn(`[Delete] Failed to remove file ${path}:`, error);
  }
}
