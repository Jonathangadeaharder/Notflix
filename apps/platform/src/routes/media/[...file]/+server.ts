import fs from 'node:fs';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import { HTTP_STATUS } from '$lib/constants';
import { CONFIG } from '$lib/server/infrastructure/config';
import {
  MediaPathError,
  resolveMediaPath,
} from '$lib/server/utils/media-path-security';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const mediaRoot = path.resolve(CONFIG.RESOLVED_UPLOAD_DIR, '..');

  let resolved: { fullPath: string; contentType: string };
  try {
    resolved = resolveMediaPath(params.file, mediaRoot);
  } catch (err) {
    if (err instanceof MediaPathError) {
      throw error(err.statusCode, err.message);
    }
    throw error(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal error');
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(resolved.fullPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw error(HTTP_STATUS.NOT_FOUND, 'File not found');
    }
    throw error(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Internal error');
  }

  const fileStream = fs.createReadStream(resolved.fullPath);

  // @ts-expect-error - ReadableStream type mismatch in some environments
  return new Response(fileStream, {
    headers: {
      'Content-Type': resolved.contentType,
      'Content-Length': stat.size.toString(),
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
