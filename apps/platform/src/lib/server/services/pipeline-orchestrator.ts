import { dirname, join } from 'node:path';
import { eq } from 'drizzle-orm';
import { video } from '$lib/server/db/schema';
import type {
  LanguageCode,
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
import { toAiServicePath } from '../infrastructure/config';
import { db as defaultDb } from '../infrastructure/database';
import {
  type AppEventBus,
  eventBus as defaultEventBus,
} from '../infrastructure/event-bus';
import { SmartFilter } from './linguistic-filter.service';
import { mediaChunker } from './media-chunker.service';

const PROGRESS_DB_MIN_INTERVAL_MS = 2000;
const TRANSCRIBE_PROGRESS_CAP_PERCENT = 80;
const ANALYZE_START_PERCENT = 85;
const TRANSLATE_START_PERCENT = 93;

type Db = typeof defaultDb;

export class PipelineOrchestrator {
  private aiGateway = new RealAiGateway();
  private filter: SmartFilter;
  private readonly db: Db;
  private readonly eventBus: AppEventBus;

  constructor(db: Db = defaultDb, eventBus: AppEventBus = defaultEventBus) {
    this.db = db;
    this.eventBus = eventBus;
    this.filter = new SmartFilter(db);
    eventBus.on(
      'video.processing.started',
      this.handleVideoProcessingStarted.bind(this),
    );
  }

  private async handleVideoProcessingStarted(payload: {
    videoId: string;
    targetLang: LanguageCode;
    nativeLang: LanguageCode;
    userId: string;
  }) {
    const { videoId, targetLang, nativeLang, userId } = payload;
    try {
      await this.executeVideoPipeline(payload);
      console.log(`[Pipeline] Processing fully complete for: ${videoId}.`);
    } catch (err) {
      await this.eventBus.emitAsync('video.processing.failed', {
        videoId,
        targetLang,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(`[Pipeline Error] videoId=${videoId}:`, err);
    }
  }

  private async executeVideoPipeline(payload: {
    videoId: string;
    targetLang: LanguageCode;
    nativeLang: LanguageCode;
    userId: string;
  }) {
    const { videoId, targetLang, nativeLang, userId } = payload;
    const [record] = await this.db
      .select()
      .from(video)
      .where(eq(video.id, videoId))
      .limit(1);
    if (!record) throw new Error(`Video not found: ${videoId}`);

    const isAudio = record.filePath.match(/\.(mp3|wav|m4a|aac|ogg)$/i);
    const audioPath = isAudio
      ? record.filePath
      : join(dirname(record.filePath), `${videoId}.mp3`);
    await this.emitProgress(videoId, targetLang, ProgressStage.TRANSCRIBING, 0);
    if (!isAudio) {
      await mediaChunker.extractAudio(record.filePath, audioPath);
    }

    const transcription = await this.transcribeWithProgress(
      videoId,
      targetLang,
      audioPath,
    );

    await this.generateThumbnail(videoId, record);

    const finalSegments = await this.analyzeSegments(
      videoId,
      targetLang,
      transcription.data,
    );

    const translated = await this.translateAndFilter(
      videoId,
      targetLang,
      nativeLang,
      userId,
      finalSegments,
    );

    await this.eventBus.emitAsync('video.processing.completed', {
      videoId,
      targetLang,
      vttJson: translated,
    });
  }

  private async emitProgress(
    videoId: string,
    targetLang: LanguageCode,
    stage: ProgressStageType,
    percent: number,
  ) {
    await this.eventBus.emitAsync('video.processing.progress', {
      videoId,
      targetLang,
      stage,
      percent,
    });
  }

  private createProgressCallback(
    videoId: string,
    targetLang: LanguageCode,
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
      await this.emitProgress(
        videoId,
        targetLang,
        ProgressStage.TRANSCRIBING,
        clamped,
      );
    };
  }

  private async transcribeWithProgress(
    videoId: string,
    targetLang: LanguageCode,
    audioPath: string,
  ): Promise<{ data: TranscriptionResponse }> {
    const aiPath = toAiServicePath(audioPath);
    console.log(`[Pipeline] Calling AI service for transcription: ${aiPath}`);

    const onProgress = this.createProgressCallback(videoId, targetLang);
    const transcription = await this.aiGateway.transcribeWithProgress(
      aiPath,
      targetLang,
      onProgress,
    );

    await this.emitProgress(
      videoId,
      targetLang,
      ProgressStage.TRANSCRIBING,
      TRANSCRIBE_PROGRESS_CAP_PERCENT,
    );
    return { data: transcription };
  }

  private async generateThumbnail(
    videoId: string,
    record: typeof video.$inferSelect,
  ): Promise<void> {
    if (record.filePath.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) return;
    const aiPath = toAiServicePath(record.filePath);
    this.aiGateway
      .generateThumbnail(aiPath)
      .then(async (res) => {
        await this.db
          .update(video)
          .set({ thumbnailPath: res.thumbnail_path })
          .where(eq(video.id, videoId));
      })
      .catch((e) => console.warn('[Pipeline] Thumbnail failed:', e));
  }

  private async analyzeSegments(
    videoId: string,
    targetLang: LanguageCode,
    transcription: TranscriptionResponse,
  ): Promise<VttSegment[]> {
    await this.emitProgress(
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
    videoId: string,
    targetLang: LanguageCode,
    nativeLang: LanguageCode,
    userId: string,
    finalSegments: VttSegment[],
  ): Promise<VttSegment[]> {
    await this.emitProgress(
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
}

export const orchestrator = new PipelineOrchestrator();
