import { aiGateway } from "$lib/server/infrastructure/container";
import { parseSrt, generateSrt } from "$lib/server/utils/subtitle-utils";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sourceLang = (formData.get("sourceLang") as string) || "es";
    const targetLang = (formData.get("targetLang") as string) || "en";

    if (!file) {
      return json(
        { error: "No file uploaded" },
        { status: HTTP_STATUS_BAD_REQUEST },
      );
    }

    const text = await file.text();
    const segments = parseSrt(text);
    const textsToTranslate = segments.map((s) => s.text);

    const translationRes = await aiGateway.translate(
      textsToTranslate,
      sourceLang,
      targetLang,
    );

    if (translationRes.translations.length !== segments.length) {
      throw new Error("Translation count mismatch");
    }

    const translatedSegments = segments.map((seg, i) => ({
      ...seg,
      text: translationRes.translations[i],
    }));

    const outputSrt = generateSrt(translatedSegments);

    return new Response(outputSrt, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="translation.srt"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Translate Debug Error:", message);
    return json(
      { error: message },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR },
    );
  }
};
