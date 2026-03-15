import { fail } from "@sveltejs/kit";
import { db } from "$lib/server/infrastructure/database";
import { video } from "@notflix/database";
import { orchestrator } from "$lib/server/infrastructure/container";
import { CONFIG } from "$lib/server/infrastructure/config";
import { taskRegistry } from "$lib/server/services/task-registry.service";
import { handleVideoUpload } from "$lib/server/services/upload-video.service";

import { HTTP_STATUS } from "$lib/constants";

export const load = async () => {
  return {
    initialData: {
      title: "",
      targetLang: "es",
    },
  };
};

export const actions = {
  upload: async ({ request, locals }) => {
    const session = await locals.auth();
    const formData = await request.formData();
    const result = await handleVideoUpload(
      {
        title: String(formData.get("title") || ""),
        targetLang: String(formData.get("targetLang") || ""),
        file: (formData.get("file") as File | null) || null,
      },
      session?.user,
      {
        uploadDir: CONFIG.RESOLVED_UPLOAD_DIR,
        defaultNativeLang: CONFIG.DEFAULT_NATIVE_LANG,
        insertVideo: (record) => db.insert(video).values(record),
        queueTask: (name, task) => taskRegistry.register(name, task),
        processVideo: (videoId, targetLang, nativeLang, userId) =>
          orchestrator.processVideo(videoId, targetLang, nativeLang, userId),
      },
    );

    if (!result.ok) {
      return fail(HTTP_STATUS.BAD_REQUEST, result.value);
    }

    return {
      success: true,
      videoId: result.value.videoId,
    };
  },
};
