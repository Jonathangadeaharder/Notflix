import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressStage } from '$lib/types';
import { ProcessingStatus } from '../infrastructure/config';
import { eventBus } from '../infrastructure/event-bus';

// ── DB mock ─────────────────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file, so we cannot reference
// variables declared at module scope inside them.  Use vi.hoisted() to create
// the spy references before hoisting occurs.
const {
  mockInsert,
  mockValues,
  mockOnConflictDoUpdate,
  mockUpdate,
  mockSet,
  mockWhere,
} = vi.hoisted(() => {
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({
    onConflictDoUpdate: mockOnConflictDoUpdate,
  });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  return {
    mockInsert,
    mockValues,
    mockOnConflictDoUpdate,
    mockUpdate,
    mockSet,
    mockWhere,
  };
});

vi.mock('../infrastructure/database', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
  },
}));

// Import after mocking so the singleton wires listeners onto the mocked DB.
// eslint-disable-next-line import/first
import { progressPersistence } from './progress-persistence';

const VIDEO_ID = 'v-persist-001';
const TARGET_LANG = 'es' as const;

describe('ProgressPersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mock return values after clearAllMocks
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockInsert.mockReturnValue({ values: mockValues });
    mockWhere.mockResolvedValue(undefined);
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
  });

  it('should be instantiated (singleton exported)', () => {
    expect(progressPersistence).toBeDefined();
  });

  it('inserts PROCESSING/QUEUED row on video.processing.started', async () => {
    await eventBus.emitAsync('video.processing.started', {
      videoId: VIDEO_ID,
      targetLang: TARGET_LANG,
      nativeLang: 'en' as const,
      userId: 'u-1',
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        videoId: VIDEO_ID,
        targetLang: TARGET_LANG,
        status: ProcessingStatus.PROCESSING,
        progressStage: ProgressStage.QUEUED,
        progressPercent: 0,
      }),
    );
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
    await eventBus.emitAsync('video.processing.progress', {
      videoId: VIDEO_ID,
      targetLang: TARGET_LANG,
      stage: ProgressStage.TRANSCRIBING,
      percent: 45,
    });

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProcessingStatus.PROCESSING,
        progressStage: ProgressStage.TRANSCRIBING,
        progressPercent: 45,
      }),
    );
    expect(mockWhere).toHaveBeenCalled();
  });

  it('marks status COMPLETED and progressStage READY on video.processing.completed', async () => {
    await eventBus.emitAsync('video.processing.completed', {
      videoId: VIDEO_ID,
      targetLang: TARGET_LANG,
      vttJson: [],
    });

    expect(mockUpdate).toHaveBeenCalled();
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
    await eventBus.emitAsync('video.processing.failed', {
      videoId: VIDEO_ID,
      targetLang: TARGET_LANG,
      error: 'transcription timeout',
    });

    expect(mockUpdate).toHaveBeenCalled();
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
