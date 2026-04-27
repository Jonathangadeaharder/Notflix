import { and, eq } from 'drizzle-orm';
import { video, videoProcessing } from '$lib/server/db/schema';
import type {
  ProgressStageType,
  TranscriptionResponse,
  VttSegment,
} from '$lib/types';
import { ProgressStage } from '$lib/types';
import { RealAiGateway } from '../adapters/real-ai-gateway';
import {
  extractUnknownLemmas,
  mapAnalysisToSegments,
  mapTranslationsToSegments,
} from '../domain/translation-core';
import { ProcessingStatus, toAiServicePath } from '../infrastructure/config';
import { db as drizzleDb } from '../infrastructure/database';
import { eventBus } from '../infrastructure/event-bus';
import { SmartFilter } from './linguistic-filter.service';

const PROGRESS_DB_MIN_INTERVAL_MS = 2000;
const TRANSCRIBE_PROGRESS_CAP_PERCENT = 80;
const ANALYZE_START_PERCENT = 85;
const TRANSLATE_START_PERCENT = 93;

class PipelineOrchestrator {
  private aiGateway = new RealAiGateway();
  private filter = new SmartFilter(drizzleDb);

  constructor() {
    eventBus.on(
      'video.processing.started',
      this.handleVideoProcessingStarted.bind(this),
    );
  }

  private async handleVideoProcessingStarted(payload: {
    videoId: string;
    targetLang: string;
    nativeLang: string;
    userId: string;
  }) {
    const { videoId, targetLang, nativeLang, userId } = payload;
    try {
      await this.initProcessingRecord(drizzleDb, videoId, targetLang);
      const transcription = await this.transcribeWithProgress(
        drizzleDb,
        videoId,
        targetLang,
      );
      await this.generateThumbnail(drizzleDb, videoId, transcription.record);
      const finalSegments = await this.analyzeSegments(
        drizzleDb,
        videoId,
        targetLang,
        transcription.data,
      );
      const translated = await this.translateAndFilter(
        drizzleDb,
        videoId,
        targetLang,
        nativeLang,
        userId,
        finalSegments,
      );
      await this.persistCompletion(drizzleDb, videoId, targetLang, translated);

      eventBus.emit('video.processing.completed', {
        videoId,
        targetLang: targetLang as any,
      });

      console.log(`[Pipeline] Processing fully complete for: ${videoId}.`);
    } catch (err) {
      await this.handleProcessingError(drizzleDb, videoId, targetLang, err);
      eventBus.emit('video.processing.failed', {
        videoId,
        targetLang: targetLang as any,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(`[Pipeline Error] videoId=${videoId}:`, err);
    }
  }

  private async initProcessingRecord(
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

  private createProgressCallback(
    db: typeof drizzleDb,
    videoId: string,
    targetLang: string,
  ): (percent: number) => Promise<void> {
    let lastPersistedPercent = 0;
    let lastPersistedAt = 0;

    return async (percent) => {
      const clamped = Math.min(
        TRANSCRIBE_PROGRESS_CAP_PERCENT,
        Math.max(0, Math.round(percent)),
      );
      const now = Date.now();
      if (clamped <= lastPersistedPercent) return;
      if (now - lastPersistedAt < PROGRESS_DB_MIN_INTERVAL_MS) return;
      lastPersistedPercent = clamped;
      lastPersistedAt = now;
      console.log(`[Pipeline] Transcription progress: ${clamped}%`);
      await this.setStage(
        db,
        videoId,
        targetLang,
        ProgressStage.TRANSCRIBING,
        clamped,
      );
    };
  }

  private async transcribeWithProgress(
    db: typeof drizzleDb,
    videoId: string,
    targetLang: string,
  ): Promise<{
    record: typeof video.$inferSelect;
    data: TranscriptionResponse;
  }> {
    await this.setStage(db, videoId, targetLang, ProgressStage.TRANSCRIBING, 0);
    const [record] = await db
      .select()
      .from(video)
      .where(eq(video.id, videoId))
      .limit(1);
    if (!record) throw new Error(`Video not found: ${videoId}`);

    const aiPath = toAiServicePath(record.filePath);
    console.log(`[Pipeline] Calling AI service for transcription: ${aiPath}`);

    const onProgress = this.createProgressCallback(db, videoId, targetLang);
    const transcription = await this.aiGateway.transcribeWithProgress(
      aiPath,
      targetLang,
      onProgress,
    );

    await this.setStage(
      db,
      videoId,
      targetLang,
      ProgressStage.TRANSCRIBING,
      TRANSCRIBE_PROGRESS_CAP_PERCENT,
    );
    return { record, data: transcription };
  }

  private async generateThumbnail(
    db: typeof drizzleDb,
    videoId: string,
    record: typeof video.$inferSelect,
  ): Promise<void> {
    if (record.filePath.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) return;
    const aiPath = toAiServicePath(record.filePath);
    this.aiGateway
      .generateThumbnail(aiPath)
      .then(async (res) => {
        await db
          .update(video)
          .set({ thumbnailPath: res.thumbnail_path })
          .where(eq(video.id, videoId));
      })
      .catch((e) => console.warn('[Pipeline] Thumbnail failed:', e));
  }

  private async analyzeSegments(
    db: typeof drizzleDb,
    videoId: string,
    targetLang: string,
    transcription: TranscriptionResponse,
  ): Promise<VttSegment[]> {
    await this.setStage(
      db,
      videoId,
      targetLang,
      ProgressStage.ANALYZING,
      ANALYZE_START_PERCENT,
    );
    console.log(`[Pipeline] Starting Analysis.`);
    const segmentTexts = transcription.segments.map((s) => s.text);
    const batchAnalysis = await this.aiGateway.analyzeBatch(
      segmentTexts,
      targetLang,
    );
    return mapAnalysisToSegments(transcription, batchAnalysis.results);
  }

  private async translateAndFilter(
    db: typeof drizzleDb,
    videoId: string,
    targetLang: string,
    nativeLang: string,
    userId: string,
    finalSegments: VttSegment[],
  ): Promise<VttSegment[]> {
    await this.setStage(
      db,
      videoId,
      targetLang,
      ProgressStage.TRANSLATING,
      TRANSLATE_START_PERCENT,
    );
    console.log(`[Pipeline] Starting Translation.`);

    const segmentsTokens = finalSegments.map((s) => s.tokens);
    const filteredSegments = await this.filter.filterBatch(
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
        ? this.aiGateway.translate(lemmaList, targetLang, nativeLang)
        : Promise.resolve({ translations: [] }),
      this.aiGateway.translate(sentenceTexts, targetLang, nativeLang),
    ]);

    return mapTranslationsToSegments(
      finalSegments,
      lemmaList,
      lemmaRes.translations,
      sentenceRes.translations,
    );
  }

  private async persistCompletion(
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

  private async handleProcessingError(
    db: typeof drizzleDb,
    videoId: string,
    targetLang: string,
    err: unknown,
  ): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);
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

  private async setStage(
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

    eventBus.emit('video.processing.progress', {
      videoId,
      targetLang: targetLang as any,
      stage,
      percent,
    });
  }
}

export const orchestrator = new PipelineOrchestrator();
