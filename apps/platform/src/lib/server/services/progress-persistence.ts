import { and, eq } from 'drizzle-orm';
import { videoProcessing } from '$lib/server/db/schema';
import { ProgressStage } from '$lib/types';
import { ProcessingStatus } from '../infrastructure/config';
import { db } from '../infrastructure/database';
import { eventBus } from '../infrastructure/event-bus';

class ProgressPersistenceService {
  constructor() {
    eventBus.on('video.processing.started', this.handleStarted.bind(this));
    eventBus.on('video.processing.progress', this.handleProgress.bind(this));
    eventBus.on('video.processing.completed', this.handleCompleted.bind(this));
    eventBus.on('video.processing.failed', this.handleFailed.bind(this));
  }

  private async handleStarted(payload: {
    videoId: string;
    targetLang: string;
  }) {
    await db
      .insert(videoProcessing)
      .values({
        videoId: payload.videoId,
        targetLang: payload.targetLang,
        status: ProcessingStatus.PROCESSING,
        progressStage: ProgressStage.QUEUED,
        progressPercent: 0,
      })
      .onConflictDoUpdate({
        target: [videoProcessing.videoId, videoProcessing.targetLang],
        set: {
          status: ProcessingStatus.PROCESSING,
          progressStage: ProgressStage.QUEUED,
          progressPercent: 0,
          vttJson: null,
        },
      });
  }

  private async handleProgress(payload: {
    videoId: string;
    targetLang: string;
    stage: string;
    percent: number;
  }) {
    await db
      .update(videoProcessing)
      .set({
        status: ProcessingStatus.PROCESSING,
        progressStage: payload.stage as any,
        progressPercent: payload.percent,
      })
      .where(
        and(
          eq(videoProcessing.videoId, payload.videoId),
          eq(videoProcessing.targetLang, payload.targetLang),
        ),
      );
  }

  private async handleCompleted(payload: {
    videoId: string;
    targetLang: string;
    vttJson: any;
  }) {
    await db
      .update(videoProcessing)
      .set({
        status: ProcessingStatus.COMPLETED,
        progressStage: ProgressStage.READY,
        progressPercent: 100,
        vttJson: payload.vttJson,
      })
      .where(
        and(
          eq(videoProcessing.videoId, payload.videoId),
          eq(videoProcessing.targetLang, payload.targetLang),
        ),
      );
  }

  private async handleFailed(payload: {
    videoId: string;
    targetLang: string;
    error: string;
  }) {
    await db
      .update(videoProcessing)
      .set({
        status: ProcessingStatus.ERROR,
        progressStage: ProgressStage.FAILED,
      })
      .where(
        and(
          eq(videoProcessing.videoId, payload.videoId),
          eq(videoProcessing.targetLang, payload.targetLang),
        ),
      );
  }
}

export const progressPersistence = new ProgressPersistenceService();
