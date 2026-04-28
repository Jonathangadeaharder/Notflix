import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressStage } from '$lib/types';
import { ProcessingStatus } from '../infrastructure/config';
import { AppEventBus } from '../infrastructure/event-bus';
import { ProgressPersistenceService } from './progress-persistence';

const VIDEO_ID = 'v-persist-001';
const TARGET_LANG = 'es' as const;

describe('ProgressPersistenceService', () => {
  let bus: AppEventBus;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockValues: ReturnType<typeof vi.fn>;
  let mockOnConflictDoUpdate: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockWhere: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    mockValues = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockInsert = vi.fn().mockReturnValue({ values: mockValues });

    mockWhere = vi.fn().mockResolvedValue(undefined);
    mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

    const mockDb = { insert: mockInsert, update: mockUpdate } as any;
    bus = new AppEventBus();
    // Instance is intentionally unused — constructor wires handlers onto bus.
    const persistence = new ProgressPersistenceService(mockDb, bus);
    expect(persistence).toBeDefined();
  });

  it('inserts PROCESSING/QUEUED row on video.processing.started', async () => {
    await bus.emitAsync('video.processing.started', {
      videoId: VIDEO_ID,
      targetLang: TARGET_LANG,
      nativeLang: 'en' as const,
      userId: 'u-1',
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: VIDEO_ID,
        targetLang: TARGET_LANG,
        status: ProcessingStatus.PROCESSING,
        progressStage: ProgressStage.QUEUED,
        progressPercent: 0,
      }),
    );
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          status: ProcessingStatus.PROCESSING,
          progressStage: ProgressStage.QUEUED,
        }),
      }),
    );
  });

  it('updates progressStage and progressPercent on video.processing.progress (E2.4)', async () => {
    await bus.emitAsync('video.processing.progress', {
      videoId: VIDEO_ID,
      targetLang: TARGET_LANG,
      stage: ProgressStage.TRANSCRIBING,
      percent: 45,
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProcessingStatus.PROCESSING,
        progressStage: ProgressStage.TRANSCRIBING,
        progressPercent: 45,
      }),
    );
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });

  it('marks status COMPLETED and progressStage READY on video.processing.completed', async () => {
    await bus.emitAsync('video.processing.completed', {
      videoId: VIDEO_ID,
      targetLang: TARGET_LANG,
      vttJson: [],
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProcessingStatus.COMPLETED,
        progressStage: ProgressStage.READY,
        progressPercent: 100,
        vttJson: [],
      }),
    );
  });

  it('marks status ERROR and progressStage FAILED on video.processing.failed', async () => {
    await bus.emitAsync('video.processing.failed', {
      videoId: VIDEO_ID,
      targetLang: TARGET_LANG,
      error: 'transcription timeout',
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProcessingStatus.ERROR,
        progressStage: ProgressStage.FAILED,
      }),
    );
  });

  it('ProgressStage enum covers all UI-visible pipeline stages (E2.4 contract)', () => {
    const stages = Object.values(ProgressStage);
    expect(stages).toContain(ProgressStage.QUEUED);
    expect(stages).toContain(ProgressStage.TRANSCRIBING);
    expect(stages).toContain(ProgressStage.ANALYZING);
    expect(stages).toContain(ProgressStage.TRANSLATING);
    expect(stages).toContain(ProgressStage.READY);
    expect(stages).toContain(ProgressStage.FAILED);
  });
});
