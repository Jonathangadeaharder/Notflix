import { fail, redirect } from "@sveltejs/kit";
import { db } from "$lib/server/infrastructure/database";
import { video } from "$lib/server/db/schema";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { CONFIG } from "$lib/server/infrastructure/config";
import { z } from "zod";
import { processVideo } from "$lib/server/services/video-pipeline";

import { HTTP_STATUS, LIMITS } from "$lib/constants";

const MIN_LANG_LEN = 2;
const MAX_LANG_LEN = 5;

// Define schema for validation
const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(LIMITS.MAX_TITLE_LENGTH),
  targetLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).default("es"),
  nativeLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).optional(),
});

export const load = async () => {
  return {
    initialData: {
      title: "",
      targetLang: "es",
      nativeLang: "en",
    },
  };
};

function parseUploadForm(formData: FormData) {
  const title = formData.get("title") as string;
  const targetLang = formData.get("targetLang") as string;
  const nativeLang = formData.get("nativeLang") as string;
  const file = formData.get("file") as File;
  const result = uploadSchema.safeParse({ title, targetLang, nativeLang });
  return { title, targetLang, nativeLang, file, result };
}

function validateUploadForm(
  file: File,
  result: z.SafeParseReturnType<
    { title: string; targetLang: string; nativeLang: string },
    { title: string; targetLang: string; nativeLang: string }
  >,
  title: string,
  targetLang: string,
  nativeLang: string,
) {
  if (result.success && file && file.size !== 0) return null;
  const fieldErrors = result.success ? {} : result.error.flatten().fieldErrors;
  const fileErrors = !file || file.size === 0 ? ["File is required"] : [];
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
    if (!session) throw redirect(HTTP_STATUS.SEE_OTHER, "/login");
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

    const videoId = crypto.randomUUID();
    const filePath = await saveUploadedFile(file, videoId);

    await db.insert(video).values({
      id: videoId,
      title: result.data.title,
      filePath: filePath,
      thumbnailPath: "/placeholder.jpg",
      views: 0,
      published: true,
    });

    processVideo({
      videoId,
      targetLang: result.data.targetLang,
      nativeLang:
        result.data.nativeLang ??
        session.user.nativeLang ??
        CONFIG.DEFAULT_NATIVE_LANG,
      userId: session.user.id,
    }).catch((err) =>
      console.error(`[Pipeline] Background error for ${videoId}:`, err),
    );

    throw redirect(HTTP_STATUS.SEE_OTHER, "/studio");
  },
};

async function saveUploadedFile(file: File, videoId: string): Promise<string> {
  const targetDir = CONFIG.RESOLVED_UPLOAD_DIR;
  await mkdir(targetDir, { recursive: true });

  const ext = file.name.split(".").pop();
  const fileName = `${videoId}.${ext}`;
  const filePath = join(targetDir, fileName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);

  return filePath;
}
