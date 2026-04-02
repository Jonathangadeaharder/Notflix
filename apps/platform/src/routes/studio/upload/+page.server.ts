import { fail, redirect } from "@sveltejs/kit";
import { db } from "$lib/server/infrastructure/database";
import { video } from "@notflix/database";
import { mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { z } from "zod";
import { CONFIG } from "$lib/server/infrastructure/config";
import { startVideoProcessingWithDefaults } from "$lib/server/services/process-video-request.service";

import { HTTP_STATUS, LIMITS } from "$lib/constants";

const MIN_LANG_LEN = 2;
const MAX_LANG_LEN = 5;

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required").max(LIMITS.MAX_TITLE_LENGTH),
  targetLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).default("es"),
  nativeLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).default("en"),
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

export const actions = {
  upload: async ({ request, locals }) => {
    const session = await locals.auth();
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const targetLang = formData.get("targetLang") as string;
    const nativeLang = formData.get("nativeLang") as string;
    const file = formData.get("file") as File;

    const result = uploadSchema.safeParse({ title, targetLang, nativeLang });

    if (!result.success || !file || file.size === 0) {
      const fieldErrors = result.success
        ? {}
        : result.error.flatten().fieldErrors;
      const fileErrors = !file || file.size === 0 ? ["File is required"] : [];

      return fail(HTTP_STATUS.BAD_REQUEST, {
        errors: {
          ...fieldErrors,
          file: fileErrors.length > 0 ? fileErrors : undefined,
        },
        data: { title, targetLang, nativeLang },
      });
    }

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

    startVideoProcessingWithDefaults({
      videoId,
      userId: session?.user.id ?? "",
      targetLang: result.data.targetLang,
      nativeLang: result.data.nativeLang,
    });

    throw redirect(HTTP_STATUS.SEE_OTHER, "/studio");
  },
};

import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

async function saveUploadedFile(file: File, videoId: string): Promise<string> {
  const targetDir = CONFIG.RESOLVED_UPLOAD_DIR;
  await mkdir(targetDir, { recursive: true });

  const ext = file.name.split(".").pop();
  const fileName = `${videoId}.${ext}`;
  const filePath = join(targetDir, fileName);

  const writeStream = createWriteStream(filePath);
  await pipeline(
    file.stream() as unknown as NodeJS.ReadableStream,
    writeStream,
  );

  return filePath;
}
