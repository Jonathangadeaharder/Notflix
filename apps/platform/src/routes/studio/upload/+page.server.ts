import { fail, redirect } from '@sveltejs/kit';
import crypto from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { HTTP_STATUS, LIMITS } from '$lib/constants';
import { video } from '$lib/server/db/schema';
import { CONFIG } from '$lib/server/infrastructure/config';
import { db } from '$lib/server/infrastructure/database';
import { eventBus } from '$lib/server/infrastructure/event-bus';
import type { LanguageCode } from '$lib/types';

const MIN_LANG_LEN = 2;
const MAX_LANG_LEN = 5;

// Define schema for validation
const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(LIMITS.MAX_TITLE_LENGTH),
  targetLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).default('es'),
  nativeLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).optional(),
});

export const load = async () => {
  return {
    initialData: {
      title: '',
      targetLang: 'es',
      nativeLang: 'en',
    },
  };
};

function parseUploadForm(formData: FormData) {
  const rawTitle = formData.get('title');
  const rawTargetLang = formData.get('targetLang');
  const rawNativeLang = formData.get('nativeLang');
  const rawFile = formData.get('file');

  const title = typeof rawTitle === 'string' ? rawTitle : '';
  const targetLang = typeof rawTargetLang === 'string' ? rawTargetLang : '';
  const nativeLang = typeof rawNativeLang === 'string' ? rawNativeLang : '';
  const file = rawFile instanceof File ? rawFile : null;

  const result = uploadSchema.safeParse({ title, targetLang, nativeLang });
  return { title, targetLang, nativeLang, file, result };
}

function validateUploadForm(
  file: File | null,
  result: ReturnType<typeof uploadSchema.safeParse>,
  title: string,
  targetLang: string,
  nativeLang: string,
) {
  if (result.success && file && file.size !== 0) return null;
  const fieldErrors = result.success ? {} : result.error.flatten().fieldErrors;
  const fileErrors = !file || file.size === 0 ? ['File is required'] : [];
  return fail(HTTP_STATUS.BAD_REQUEST, {
    errors: {
      ...fieldErrors,
      file: fileErrors.length > 0 ? fileErrors : undefined,
    },
    data: { title, targetLang, nativeLang },
  });
}

export const actions = {
  upload: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session) throw redirect(HTTP_STATUS.SEE_OTHER, '/login');
    const formData = await request.formData();

    const { title, targetLang, nativeLang, file, result } =
      parseUploadForm(formData);
    const validationFailure = validateUploadForm(
      file,
      result,
      title,
      targetLang,
      nativeLang,
    );
    if (validationFailure) return validationFailure;

    if (!result.success) return validationFailure;
    const validatedFile = file as File;

    const videoId = crypto.randomUUID();
    const filePath = await saveUploadedFile(validatedFile, videoId);

    await db.insert(video).values({
      id: videoId,
      title: result.data.title,
      filePath: filePath,
      thumbnailPath: '/placeholder.jpg',
      views: 0,
      published: true,
    });

    eventBus
      .emitAsync('video.processing.started', {
        videoId,
        targetLang: result.data.targetLang as LanguageCode,
        nativeLang: (result.data.nativeLang ??
          session.user.nativeLang ??
          CONFIG.DEFAULT_NATIVE_LANG) as LanguageCode,
        userId: session.user.id,
      })
      .catch((err) =>
        console.error(`[Pipeline] Background error for ${videoId}:`, err),
      );

    throw redirect(HTTP_STATUS.SEE_OTHER, '/studio');
  },
};

async function saveUploadedFile(file: File, videoId: string): Promise<string> {
  const targetDir = CONFIG.RESOLVED_UPLOAD_DIR;
  await mkdir(targetDir, { recursive: true });

  const ext = file.name.split('.').pop();
  const fileName = `${videoId}.${ext}`;
  const filePath = join(targetDir, fileName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);

  return filePath;
}
