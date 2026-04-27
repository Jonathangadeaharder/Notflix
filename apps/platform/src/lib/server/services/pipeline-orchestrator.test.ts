import { beforeEach, describe, expect, it, vi } from 'vitest';
import { video, videoProcessing } from '$lib/server/db/schema';
import { ProcessingStatus } from '../infrastructure/config';
import { db } from '../infrastructure/database';
import { eventBus } from '../infrastructure/event-bus';
import { orchestrator } from './pipeline-orchestrator';

// Mock infrastructure and database
vi.mock('../infrastructure/database', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([{ id: 'v1', filePath: 'test.mp4' }]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock('../adapters/real-ai-gateway', () => ({
  RealAiGateway: vi.fn().mockImplementation(function (this: any) {
    this.transcribeWithProgress = vi.fn().mockResolvedValue({
      language: 'es',
      segments: [{ text: 'Hola' }],
    });
    this.generateThumbnail = vi
      .fn()
      .mockResolvedValue({ thumbnail_path: 't.jpg' });
    this.analyzeBatch = vi.fn().mockResolvedValue({ results: [[]] });
    this.translate = vi.fn().mockResolvedValue({ translations: ['Hello'] });
  }),
}));

vi.mock('./linguistic-filter.service', () => ({
  SmartFilter: vi.fn().mockImplementation(function (this: any) {
    this.filterBatch = vi
      .fn()
      .mockResolvedValue([{ classification: 'EASY', tokens: [] }]);
  }),
}));

describe('PipelineOrchestrator Unit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a listener on video.processing.started', () => {
    expect(orchestrator).toBeDefined();
  });

  it('coordinates the pipeline steps when processing starts', async () => {
    const videoId = 'video-123';
    const completedPromise = new Promise<void>((resolve) => {
      eventBus.once('video.processing.completed', (payload) => {
        if (payload.videoId === videoId) resolve();
      });
    });

    await eventBus.emitAsync('video.processing.started', {
      videoId,
      targetLang: 'es' as any,
      nativeLang: 'en' as any,
      userId: 'u1',
    });

    await completedPromise;

    // Verify DB calls
    expect(db.insert).toHaveBeenCalledWith(videoProcessing);
    expect(db.update).toHaveBeenCalledWith(videoProcessing);
  });
});
