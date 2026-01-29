// Use relative imports to avoid alias issues if not configured
import { orchestrator } from "../src/lib/server/infrastructure/container";
import { db } from "../src/lib/server/infrastructure/database";
import { video, videoProcessing } from "@notflix/database";
import { eq } from "drizzle-orm";
import path from "path";

const EXIT_CODE_FAILURE = 1;
const EXIT_CODE_SUCCESS = 0;

async function run() {
  console.log("Starting E2E Verification...");

  const videoId = "test_e2e_" + Date.now();
  const filePath = path.resolve(process.cwd(), "../../media/test_audio.mp3");

  console.log(`Inserting test video: ${videoId}`);
  await db.insert(video).values({
    id: videoId,
    title: "E2E Test Video",
    filePath: filePath,
    thumbnailPath: "/thumb.jpg",
    views: 0,
    published: true,
  });

  console.log("Triggering Orchestrator...");
  try {
    await orchestrator.processVideo(videoId, "es");
    console.log("Orchestrator finished.");

    // Verify result
    const result = await db.query.videoProcessing.findFirst({
      where: eq(videoProcessing.videoId, videoId),
    });

    if (result?.status === "COMPLETED" && result.vttJson) {
      console.log("SUCCESS: Video processed and VTT JSON saved.");
      const firstToken = result.vttJson[0]?.tokens[0];
      console.log("Sample Token:", firstToken);
    } else {
      console.error(
        "FAILURE: Processing record not found or not completed.",
        result,
      );
      process.exit(EXIT_CODE_FAILURE);
    }
  } catch (e) {
    console.error("E2E Error:", e);
    process.exit(EXIT_CODE_FAILURE);
  }

  process.exit(EXIT_CODE_SUCCESS);
}

run();
