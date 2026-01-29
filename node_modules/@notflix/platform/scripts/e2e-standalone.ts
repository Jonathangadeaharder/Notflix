import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@notflix/database";
import {
  video,
  videoProcessing,
  type DbVttSegment,
  type DbTokenAnalysis,
} from "@notflix/database";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://admin:password@127.0.0.1:5432/main_db";
const BRAIN_URL = "http://127.0.0.1:8000";
const TEST_AUDIO_PATH =
  "E:/Users/Jonandrop/IdeaProjects/Notflix/media/test_audio.mp3";
const MAX_SEGMENTS_TO_ANALYZE = 3;

async function run() {
  console.log("Starting Standalone E2E...");

  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  const videoId = crypto.randomUUID();

  try {
    await insertTestVideo(db, videoId);
    const transcription = await callTranscribe(TEST_AUDIO_PATH);
    const processedSegments = await analyzeSegments(transcription);
    await saveProcessingResults(db, videoId, processedSegments);
    await verifyResults(db, videoId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ E2E Error:", message);
  } finally {
    await client.end();
  }
}

async function insertTestVideo(
  db: PostgresJsDatabase<typeof schema>,
  videoId: string,
) {
  console.log(`Inserting video: ${videoId}`);
  await db.insert(video).values({
    id: videoId,
    title: "Standalone E2E Video",
    filePath: TEST_AUDIO_PATH,
    thumbnailPath: "/thumb.jpg",
    views: 0,
    published: true,
  });
}

interface TranscriptionOutput {
  segments: { start: number; end: number; text: string }[];
}

async function callTranscribe(filePath: string): Promise<TranscriptionOutput> {
  console.log("Calling Python Transcribe...");
  const res = await fetch(`${BRAIN_URL}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: filePath, language: "es" }),
  });

  if (!res.ok) throw new Error(`Transcribe failed: ${res.statusText}`);
  const data = (await res.json()) as TranscriptionOutput;
  return data;
}

interface FilterOutput {
  results: DbTokenAnalysis[][];
}

async function analyzeSegments(
  transcription: TranscriptionOutput,
): Promise<DbVttSegment[]> {
  console.log("Calling Python Analyze...");
  const processedSegments: DbVttSegment[] = [];

  for (const seg of transcription.segments.slice(0, MAX_SEGMENTS_TO_ANALYZE)) {
    const res = await fetch(`${BRAIN_URL}/filter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [seg.text], language: "es" }),
    });
    if (!res.ok) throw new Error(`Analyze failed: ${res.statusText}`);
    const analysis = (await res.json()) as FilterOutput;

    processedSegments.push({
      start: seg.start,
      end: seg.end,
      text: seg.text,
      tokens: analysis.results[0],
    });
  }
  return processedSegments;
}

async function saveProcessingResults(
  db: PostgresJsDatabase<typeof schema>,
  videoId: string,
  segments: DbVttSegment[],
) {
  console.log("Saving results to DB...");
  await db.insert(videoProcessing).values({
    videoId: videoId,
    targetLang: "es",
    status: "COMPLETED",
    vttJson: segments,
  });
}

async function verifyResults(
  db: PostgresJsDatabase<typeof schema>,
  videoId: string,
) {
  const record = await db.query.videoProcessing.findFirst({
    where: eq(videoProcessing.videoId, videoId),
  });

  if (record?.status === "COMPLETED") {
    console.log("✅ SUCCESS: E2E Flow Completed.");
    const firstSeg = record.vttJson?.[0];
    console.log("First segment text:", firstSeg?.text);
  } else {
    console.error("❌ FAILURE: DB record not found or status wrong.");
  }
}

run();
