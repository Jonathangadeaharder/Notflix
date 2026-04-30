import fs from 'node:fs';
import path from 'node:path';
import { HTTP_STATUS } from '$lib/constants';

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

export interface ResolvedMediaPath {
  fullPath: string;
  contentType: string;
}

export class MediaPathError extends Error {
  public readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function resolveMediaPath(
  filePath: string | undefined,
  mediaRoot: string,
): ResolvedMediaPath {
  if (!filePath) {
    throw new MediaPathError(HTTP_STATUS.BAD_REQUEST, 'Missing file path');
  }

  const resolvedMediaRoot = path.resolve(mediaRoot);
  const fullPath = path.resolve(resolvedMediaRoot, filePath);

  const canonicalRoot = fs.realpathSync(resolvedMediaRoot);
  let canonicalPath: string;
  try {
    canonicalPath = fs.realpathSync(fullPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new MediaPathError(HTTP_STATUS.NOT_FOUND, 'File not found');
    }
    try {
      const parentDir = path.dirname(fullPath);
      const canonicalParent = fs.realpathSync(parentDir);
      canonicalPath = path.join(canonicalParent, path.basename(fullPath));
    } catch {
      canonicalPath = path.resolve(fullPath);
    }
  }

  const relativePath = path.relative(canonicalRoot, canonicalPath);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`${path.sep}..`) ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new MediaPathError(HTTP_STATUS.FORBIDDEN, 'Forbidden');
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = CONTENT_TYPE_MAP[ext] || DEFAULT_CONTENT_TYPE;

  return { fullPath: canonicalPath, contentType };
}
