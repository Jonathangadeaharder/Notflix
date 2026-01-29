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
    const language = (formData.get("language") as string) || "es";

    if (!file) {
      return json(
        { error: "No file uploaded" },
        { status: HTTP_STATUS_BAD_REQUEST },
      );
    }

    const text = await file.text();
    const segments = parseSrt(text);
    const textsToAnalyze = segments.map((s) => s.text);

    if (textsToAnalyze.length > 0) {
      const analysis = await aiGateway.analyzeBatch(textsToAnalyze, language);

      segments.forEach((seg, i) => {
        const lemmas = analysis.results[i].map((t) => t.lemma).join(" ");
        seg.text = `${seg.text}\n{Lemmas: ${lemmas}}`;
      });
    }

    const outputSrt = generateSrt(segments);

    return new Response(outputSrt, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="filtered_${file.name}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Filter Debug Error:", message);
    return json(
      { error: message },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR },
    );
  }
};
