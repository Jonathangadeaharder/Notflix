import { video, videoProcessing, type DbVttSegment } from "@notflix/database";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type {
  IAiGateway,
  TranscriptionResponse,
  TokenAnalysis,
} from "../domain/interfaces";
import {
  CONFIG,
  ProcessingStatus,
  toAiServicePath,
} from "../infrastructure/config";
import { LIMITS } from "$lib/constants";
import type { SmartFilter } from "./linguistic-filter.service";
import { db as drizzleDb } from "../infrastructure/database";
import { logger } from "$lib/logger";

// Infer types from schema
type VideoRecord = InferSelectModel<typeof video>;

type ProgressEmitter = (status: string, percent: number) => void;

// VTT Segment for application logic (mapping DbVttSegment to local needs if necessary)
export type VttSegment = DbVttSegment;

const Progress = {
  THUMBNAIL: 5,
  TRANSCRIBE: 10,
  ANALYZE: 50,
  TRANSLATE: 80,
} as const;

export class Orchestrator {
  constructor(
    private aiGateway: IAiGateway,
    private db: typeof drizzleDb,
    private filter: SmartFilter,
  ) {}

  async processVideo(
    videoId: string,
    targetLang: string = CONFIG.DEFAULT_TARGET_LANG,
    nativeLang: string = CONFIG.DEFAULT_NATIVE_LANG,
    userId?: string,
  ) {
    const ctx = { videoId, userId, targetLang };
    const emitProgress: ProgressEmitter = (status: string, percent: number) => {
      logger.debug({ ...ctx, status, percent }, "Processing progress");
    };

    logger.info(ctx, "Starting video processing");
    emitProgress("STARTING", 0);

    try {
      // 1. Acquire Lock (Atomic DB Operation)
      const locked = await this.acquireProcessingLock(videoId, targetLang);
      if (!locked) {
        logger.warn(
          ctx,
          "Video already being processed, aborting duplicate request",
        );
        return;
      }

      const videoRecord = await this.getVideoRecord(videoId);

      logger.debug(ctx, "Generating thumbnail");
      await this.generateThumbnail(videoRecord, videoId, emitProgress);

      logger.debug(ctx, "Transcribing audio");
      const transcription = await this.transcribe(
        videoRecord,
        targetLang,
        emitProgress,
      );

      logger.debug(ctx, "Analyzing linguistic content");
      const analyzedSegments = await this.analyze(
        transcription,
        targetLang,
        emitProgress,
      );

      logger.debug(ctx, "Enriching with translations");
      const finalSegments = await this.enrichWithTranslations(
        analyzedSegments,
        targetLang,
        nativeLang,
        userId,
        emitProgress,
      );

      logger.debug(ctx, "Saving results to database");
      await this.saveResults(videoId, finalSegments);

      emitProgress(ProcessingStatus.COMPLETED, LIMITS.PERCENT_COMPLETE);
      logger.info(ctx, "Video processing completed successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ ...ctx, err: errorMessage }, "Video processing failed");
      await this.markAsError(videoId, emitProgress);
      throw err;
    }
  }

  /**
   * Resets any tasks left in PENDING state from a previous crash to ERROR.
   * Should be called on server startup.
   */
  async cleanupStaleTasks() {
    logger.info("Cleaning up stale (zombie) tasks");
    const result = await this.db
      .update(videoProcessing)
      .set({ status: ProcessingStatus.ERROR })
      .where(eq(videoProcessing.status, ProcessingStatus.PENDING))
      .returning({ videoId: videoProcessing.videoId });

    if (result.length > 0) {
      logger.warn(
        { count: result.length, videoIds: result.map((r) => r.videoId) },
        "Marked zombie tasks as ERROR",
      );
    } else {
      logger.debug("No stale tasks found");
    }
  }

  private async getVideoRecord(videoId: string): Promise<VideoRecord> {
    const [record] = await this.db
      .select()
      .from(video)
      .where(eq(video.id, videoId))
      .limit(1);

    if (!record) throw new Error(`Video not found: ${videoId}`);
    return record;
  }

  /**
   * Tries to insert a PENDING record.
   * If record exists, only updates if status is ERROR (retry).
   * If status is PENDING or COMPLETED, does nothing and returns false.
   * @returns true if lock acquired, false otherwise
   */
  private async acquireProcessingLock(
    videoId: string,
    targetLang: string,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Check existing status
      const [existing] = await tx
        .select()
        .from(videoProcessing)
        .where(eq(videoProcessing.videoId, videoId))
        .limit(1);

      if (existing) {
        if (existing.status === ProcessingStatus.PENDING) {
          return false; // Already running
        }
      }

      if (existing && existing.status === ProcessingStatus.PENDING) {
        return false;
      }

      // If we are here, we can proceed.
      // Insert or Update
      await tx
        .insert(videoProcessing)
        .values({
          videoId,
          targetLang,
          status: ProcessingStatus.PENDING,
          vttJson: null, // Reset previous results
        })
        .onConflictDoUpdate({
          target: [videoProcessing.videoId, videoProcessing.targetLang],
          set: {
            status: ProcessingStatus.PENDING,
            vttJson: null,
          },
        });

      return true;
    });
  }

  private async generateThumbnail(
    videoRecord: VideoRecord,
    videoId: string,
    emit: ProgressEmitter,
  ) {
    emit("THUMBNAIL_GENERATION", Progress.THUMBNAIL);

    // Skip thumbnail generation for audio-only files
    const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"];
    const isAudio = audioExtensions.some((ext) =>
      videoRecord.filePath.toLowerCase().endsWith(ext),
    );

    if (isAudio) {
      logger.debug(
        { videoId, filePath: videoRecord.filePath },
        "Skipping thumbnail for audio file",
      );
      return;
    }

    try {
      const aiPath = toAiServicePath(videoRecord.filePath);
      const thumbRes = await this.aiGateway.generateThumbnail(aiPath);
      await this.db
        .update(video)
        .set({ thumbnailPath: thumbRes.thumbnail_path })
        .where(eq(video.id, videoId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn(
        { videoId, err: errorMessage },
        "Thumbnail generation failed (non-critical)",
      );
    }
  }

  private async transcribe(
    videoRecord: VideoRecord,
    targetLang: string,
    emit: ProgressEmitter,
  ) {
    emit("TRANSCRIBING", Progress.TRANSCRIBE);
    const aiPath = toAiServicePath(videoRecord.filePath);
    return this.aiGateway.transcribe(aiPath, targetLang);
  }

  private async analyze(
    transcription: TranscriptionResponse,
    targetLang: string,
    emit: ProgressEmitter,
  ): Promise<VttSegment[]> {
    emit("ANALYZING", Progress.ANALYZE);
    const segmentTexts = transcription.segments.map(
      (s: { text: string }) => s.text,
    );
    const batchAnalysis = await this.aiGateway.analyzeBatch(
      segmentTexts,
      targetLang,
    );

    return transcription.segments.map(
      (seg: TranscriptionResponse["segments"][0], i: number) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
        tokens: batchAnalysis.results[i],
      }),
    );
  }

  private async enrichWithTranslations(
    segments: VttSegment[],
    targetLang: string,
    nativeLang: string,
    userId?: string,
    emit?: ProgressEmitter,
  ) {
    emit?.("TRANSLATING", Progress.TRANSLATE);

    if (!userId) {
      return this.enrichGuestTranslations(segments, targetLang, nativeLang);
    }

    return this.enrichUserTranslations(
      segments,
      targetLang,
      nativeLang,
      userId,
    );
  }

  private async enrichGuestTranslations(
    segments: VttSegment[],
    targetLang: string,
    nativeLang: string,
  ) {
    const uniqueLemmas = new Set<string>();
    segments.forEach((seg) =>
      seg.tokens.forEach((t: TokenAnalysis) => {
        if (!t.is_stop && t.pos !== "PUNCT") uniqueLemmas.add(t.lemma);
      }),
    );
    const lemmaList = Array.from(uniqueLemmas);
    if (lemmaList.length === 0) return segments;

    // Limit Guest Mode to reduce costs/load
    // Guests only get the first N unique terms translated
    const limitedLemmaList = lemmaList.slice(0, LIMITS.GUEST_LEMMA_LIMIT);

    const res = await this.aiGateway.translate(
      limitedLemmaList,
      targetLang,
      nativeLang,
    );
    const lemmaMap = new Map(
      limitedLemmaList.map((l, i) => [l, res.translations[i]]),
    ); // Only mapped ones exist

    // Also translate full sentences for "Translated" mode
    const sentenceTexts = segments.map((s) => s.text);
    const sentenceTranslations = await this.aiGateway.translate(
      sentenceTexts,
      targetLang,
      nativeLang,
    );

    return segments.map((seg, i) => ({
      ...seg,
      translation: sentenceTranslations.translations[i],
      tokens: seg.tokens.map((t: TokenAnalysis) => ({
        ...t,
        translation: lemmaMap.get(t.lemma),
      })),
    }));
  }

  private async enrichUserTranslations(
    segments: VttSegment[],
    targetLang: string,
    nativeLang: string,
    userId: string,
  ) {
    const unknownLemmasToTranslate = new Set<string>();

    // 1. Batch filter all segments
    const segmentsTokens = segments.map((s) => s.tokens);
    const filteredSegments = await this.filter.filterBatch(
      segmentsTokens,
      userId,
      targetLang,
    );

    // 2. Map filtered results back and collect unknown lemmas
    const enrichedSegments = segments.map((seg, i) => {
      const filtered = filteredSegments[i];

      filtered.tokens.forEach((t) => {
        if (!t.isKnown) unknownLemmasToTranslate.add(t.lemma);
      });

      return {
        ...seg,
        classification: filtered.classification,
        tokens: filtered.tokens,
      };
    });

    // 3. Batch translate all unknown lemmas
    const lemmaList = Array.from(unknownLemmasToTranslate);

    // 4. Translate full sentences (ALWAYS required for "Translated" mode)
    const sentenceTexts = segments.map((s) => s.text);
    // We can run lemma translation and sentence translation in parallel

    const [lemmaRes, sentenceRes] = await Promise.all([
      lemmaList.length > 0
        ? this.aiGateway.translate(lemmaList, targetLang, nativeLang)
        : Promise.resolve({ translations: [] }),
      this.aiGateway.translate(sentenceTexts, targetLang, nativeLang),
    ]);

    const translationMap = new Map(
      lemmaList.map((l, i) => [l, lemmaRes.translations[i]]),
    );

    enrichedSegments.forEach((seg, i) => {
      // Assign full sentence translation
      (seg as any).translation = sentenceRes.translations[i];

      seg.tokens.forEach(
        (t: TokenAnalysis & { isKnown?: boolean; translation?: string }) => {
          if (!t.isKnown) {
            t.translation = translationMap.get(t.lemma);
          }
        },
      );
    });

    return enrichedSegments;
  }

  private async saveResults(videoId: string, vttJson: VttSegment[]) {
    await this.db
      .update(videoProcessing)
      .set({
        status: ProcessingStatus.COMPLETED,
        vttJson: vttJson,
      })
      .where(eq(videoProcessing.videoId, videoId));
  }

  private async markAsError(videoId: string, emit: ProgressEmitter) {
    await this.db
      .update(videoProcessing)
      .set({ status: ProcessingStatus.ERROR })
      .where(eq(videoProcessing.videoId, videoId));
    emit(ProcessingStatus.ERROR, 0);
  }
}
