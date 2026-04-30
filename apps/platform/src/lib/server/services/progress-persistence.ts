import { and, eq } from 'drizzle-orm';
import { type DbVttSegment, videoProcessing } from '$lib/server/db/schema';
import { ProgressStage, type ProgressStageType } from '$lib/types';
import { ProcessingStatus } from '../infrastructure/config';
import { db as defaultDb } from '../infrastructure/database';
import {
  type AppEventBus,
  type AppEventPayloads,
  eventBus as defaultEventBus,
} from '../infrastructure/event-bus';

type Db = typeof defaultDb;

export class ProgressPersistenceService {
  constructor(
    private readonly db: Db = defaultDb,
    eventBus: AppEventBus = defaultEventBus,
  ) {
    eventBus.prependListener(
      'video.processing.started',
      this.handleStarted.bind(this),
    );
    eventBus.prependListener(
      'video.processing.progress',
      this.handleProgress.bind(this),
    );
    eventBus.prependListener(
      'video.processing.completed',
      this.handleCompleted.bind(this),
    );
    eventBus.prependListener(
      'video.processing.failed',
      this.handleFailed.bind(this),
    );
  }

  private async handleStarted(
    payload: AppEventPayloads['video.processing.started'],
  ) {
    await this.db
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

  private async handleProgress(
    payload: AppEventPayloads['video.processing.progress'],
  ) {
    await this.db
      .update(videoProcessing)
      .set({
        status: ProcessingStatus.PROCESSING,
        progressStage: payload.stage as ProgressStageType,
        progressPercent: payload.percent,
      })
      .where(
        and(
          eq(videoProcessing.videoId, payload.videoId),
          eq(videoProcessing.targetLang, payload.targetLang),
        ),
      );
  }

  private async handleCompleted(
    payload: AppEventPayloads['video.processing.completed'],
  ) {
    await this.db
      .update(videoProcessing)
      .set({
        status: ProcessingStatus.COMPLETED,
        progressStage: ProgressStage.READY,
        progressPercent: 100,
        vttJson: payload.vttJson as DbVttSegment[],
      })
      .where(
        and(
          eq(videoProcessing.videoId, payload.videoId),
          eq(videoProcessing.targetLang, payload.targetLang),
        ),
      );
  }

  private async handleFailed(
    payload: AppEventPayloads['video.processing.failed'],
  ) {
    await this.db
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
