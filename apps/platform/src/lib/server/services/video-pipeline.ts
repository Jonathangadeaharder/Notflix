import { db as drizzleDb } from "../infrastructure/database";
import { video, videoProcessing } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { ProcessingStatus, toAiServicePath } from "../infrastructure/config";
import { RealAiGateway } from "../adapters/real-ai-gateway";
import { SmartFilter } from "./linguistic-filter.service";
import {
  mapAnalysisToSegments,
  extractUnknownLemmas,
  mapTranslationsToSegments,
} from "../domain/translation-core";
import type {
  TranscriptionResponse,
  VttSegment,
  ProgressStageType,
} from "$lib/types";
import { ProgressStage } from "$lib/types";

const PROGRESS_DB_MIN_INTERVAL_MS = 2000;
const TRANSCRIBE_PROGRESS_CAP_PERCENT = 80;
const ANALYZE_START_PERCENT = 85;
const TRANSLATE_START_PERCENT = 93;

interface ProcessVideoOptions {
  videoId: string;
  targetLang: string;
  nativeLang: string;
  userId: string;
  db?: typeof drizzleDb;
}

export async function processVideo({
  videoId,
  targetLang,
  nativeLang,
  userId,
  db = drizzleDb,
}: ProcessVideoOptions): Promise<void> {
  const aiGateway = new RealAiGateway();
  const filter = new SmartFilter(db);

  try {
    await initProcessingRecord(db, videoId, targetLang);
    const transcription = await transcribeWithProgress(
      aiGateway,
      db,
      videoId,
      targetLang,
    );
    await generateThumbnail(aiGateway, db, videoId, transcription.record);
    const finalSegments = await analyzeSegments(
      aiGateway,
      db,
      videoId,
      targetLang,
      transcription.data,
    );
    const translated = await translateAndFilter(
      filter,
      aiGateway,
      db,
      videoId,
      targetLang,
      nativeLang,
      userId,
      finalSegments,
    );
    await persistCompletion(db, videoId, targetLang, translated);
    console.log(`[Pipeline] Processing fully complete for: ${videoId}.`);
  } catch (err) {
    await handleProcessingError(db, videoId, targetLang, err);
    throw err;
  }
}

async function initProcessingRecord(
  db: typeof drizzleDb,
  videoId: string,
  targetLang: string,
): Promise<void> {
  await db
    .insert(videoProcessing)
    .values({
      videoId,
      targetLang,
      status: ProcessingStatus.PENDING,
      progressStage: ProgressStage.QUEUED,
      progressPercent: 0,
      vttJson: null,
    })
    .onConflictDoUpdate({
      target: [videoProcessing.videoId, videoProcessing.targetLang],
      set: {
        status: ProcessingStatus.PENDING,
        progressStage: ProgressStage.QUEUED,
        progressPercent: 0,
        vttJson: null,
      },
    });
}

async function transcribeWithProgress(
  aiGateway: RealAiGateway,
  db: typeof drizzleDb,
  videoId: string,
  targetLang: string,
): Promise<{ record: typeof video.$inferSelect; data: TranscriptionResponse }> {
  await setStage(db, videoId, targetLang, ProgressStage.TRANSCRIBING, 0);
  const [record] = await db
    .select()
    .from(video)
    .where(eq(video.id, videoId))
    .limit(1);
  if (!record) throw new Error(`Video not found: ${videoId}`);

  const aiPath = toAiServicePath(record.filePath);
  console.log(`[Pipeline] Calling AI service for transcription: ${aiPath}`);

  let lastPersistedPercent = 0;
  let lastPersistedAt = 0;

  const transcription = await aiGateway.transcribeWithProgress(
    aiPath,
    targetLang,
    async (percent) => {
      const clamped = Math.min(
        TRANSCRIBE_PROGRESS_CAP_PERCENT,
        Math.max(0, Math.round(percent)),
      );
      const now = Date.now();
      if (
        clamped <= lastPersistedPercent &&
        now - lastPersistedAt < PROGRESS_DB_MIN_INTERVAL_MS
      )
        return;
      lastPersistedPercent = clamped;
      lastPersistedAt = now;
      console.log(`[Pipeline] Transcription progress: ${clamped}%`);
      await setStage(
        db,
        videoId,
        targetLang,
        ProgressStage.TRANSCRIBING,
        clamped,
      );
    },
  );

  await setStage(
    db,
    videoId,
    targetLang,
    ProgressStage.TRANSCRIBING,
    TRANSCRIBE_PROGRESS_CAP_PERCENT,
  );
  return { record, data: transcription };
}

async function generateThumbnail(
  aiGateway: RealAiGateway,
  db: typeof drizzleDb,
  videoId: string,
  record: typeof video.$inferSelect,
): Promise<void> {
  if (record.filePath.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) return;
  const aiPath = toAiServicePath(record.filePath);
  aiGateway
    .generateThumbnail(aiPath)
    .then(async (res) => {
      await db
        .update(video)
        .set({ thumbnailPath: res.thumbnail_path })
        .where(eq(video.id, videoId));
    })
    .catch((e) => console.warn("[Pipeline] Thumbnail failed:", e));
}

async function analyzeSegments(
  aiGateway: RealAiGateway,
  db: typeof drizzleDb,
  videoId: string,
  targetLang: string,
  transcription: TranscriptionResponse,
): Promise<VttSegment[]> {
  await setStage(
    db,
    videoId,
    targetLang,
    ProgressStage.ANALYZING,
    ANALYZE_START_PERCENT,
  );
  console.log(`[Pipeline] Starting Analysis.`);
  const segmentTexts = transcription.segments.map((s) => s.text);
  const batchAnalysis = await aiGateway.analyzeBatch(segmentTexts, targetLang);
  return mapAnalysisToSegments(transcription, batchAnalysis.results);
}

async function translateAndFilter(
  filter: SmartFilter,
  aiGateway: RealAiGateway,
  db: typeof drizzleDb,
  videoId: string,
  targetLang: string,
  nativeLang: string,
  userId: string,
  finalSegments: VttSegment[],
): Promise<VttSegment[]> {
  await setStage(
    db,
    videoId,
    targetLang,
    ProgressStage.TRANSLATING,
    TRANSLATE_START_PERCENT,
  );
  console.log(`[Pipeline] Starting Translation.`);

  const segmentsTokens = finalSegments.map((s) => s.tokens);
  const filteredSegments = await filter.filterBatch(
    segmentsTokens,
    userId,
    targetLang,
  );
  finalSegments.forEach((seg, i) => {
    seg.classification = filteredSegments[i].classification;
    seg.tokens = filteredSegments[i].tokens;
  });

  const lemmaList = extractUnknownLemmas(finalSegments);
  const sentenceTexts = finalSegments.map((s) => s.text);

  const [lemmaRes, sentenceRes] = await Promise.all([
    lemmaList.length > 0
      ? aiGateway.translate(lemmaList, targetLang, nativeLang)
      : Promise.resolve({ translations: [] }),
    aiGateway.translate(sentenceTexts, targetLang, nativeLang),
  ]);

  return mapTranslationsToSegments(
    finalSegments,
    lemmaList,
    lemmaRes.translations,
    sentenceRes.translations,
  );
}

async function persistCompletion(
  db: typeof drizzleDb,
  videoId: string,
  targetLang: string,
  finalSegments: VttSegment[],
): Promise<void> {
  await db
    .update(videoProcessing)
    .set({
      status: ProcessingStatus.COMPLETED,
      progressStage: ProgressStage.READY,
      progressPercent: 100,
      vttJson: finalSegments,
    })
    .where(
      and(
        eq(videoProcessing.videoId, videoId),
        eq(videoProcessing.targetLang, targetLang),
      ),
    );
}

async function handleProcessingError(
  db: typeof drizzleDb,
  videoId: string,
  targetLang: string,
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[Pipeline Error] videoId=${videoId}: ${message}`, stack ?? "");
  await db
    .update(videoProcessing)
    .set({
      status: ProcessingStatus.ERROR,
      progressStage: ProgressStage.FAILED,
    })
    .where(
      and(
        eq(videoProcessing.videoId, videoId),
        eq(videoProcessing.targetLang, targetLang),
      ),
    );
}

async function setStage(
  db: typeof drizzleDb,
  videoId: string,
  targetLang: string,
  stage: ProgressStageType,
  percent: number,
): Promise<void> {
  await db
    .update(videoProcessing)
    .set({ progressStage: stage, progressPercent: percent })
    .where(
      and(
        eq(videoProcessing.videoId, videoId),
        eq(videoProcessing.targetLang, targetLang),
      ),
    );
}
