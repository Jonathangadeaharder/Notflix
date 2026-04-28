import { beforeEach, describe, expect, it, vi } from 'vitest';
import { videoProcessing } from '$lib/server/db/schema';
import { AppEventBus } from '../infrastructure/event-bus';
import { mediaChunker } from './media-chunker.service';
import { PipelineOrchestrator } from './pipeline-orchestrator';
import { ProgressPersistenceService } from './progress-persistence';

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

vi.mock('./media-chunker.service', () => ({
  mediaChunker: {
    extractAudio: vi.fn().mockResolvedValue(undefined),
    splitIntoAudioChunks: vi.fn().mockResolvedValue([]),
  },
}));

describe('PipelineOrchestrator Unit', () => {
  let bus: AppEventBus;
  let mockDb: any;
  let dbInsert: ReturnType<typeof vi.fn>;
  let dbUpdate: ReturnType<typeof vi.fn>;
  let dbSelect: ReturnType<typeof vi.fn>;
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();

    dbInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });
    dbSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([{ id: 'v1', filePath: 'test.mp4' }]),
        }),
      }),
    });
    dbUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    mockDb = { insert: dbInsert, select: dbSelect, update: dbUpdate };
    bus = new AppEventBus();
    orchestrator = new PipelineOrchestrator(mockDb, bus);
    // Instance is intentionally unused — constructor wires handlers onto bus.
    const persistence = new ProgressPersistenceService(mockDb, bus);
    expect(persistence).toBeDefined();
  });

  it('registers a listener on video.processing.started', () => {
    expect(orchestrator).toBeDefined();
    expect(bus.listenerCount('video.processing.started')).toBeGreaterThan(0);
  });

  it('coordinates the pipeline steps when processing starts', async () => {
    const videoId = 'video-123';
    const completedPromise = new Promise<void>((resolve) => {
      bus.once('video.processing.completed', (payload) => {
        if (payload.videoId === videoId) resolve();
      });
    });

    await bus.emitAsync('video.processing.started', {
      videoId,
      targetLang: 'es' as any,
      nativeLang: 'en' as any,
      userId: 'u1',
    });

    await completedPromise;

    expect(mediaChunker.extractAudio).toHaveBeenCalled();
    expect(dbInsert).toHaveBeenCalledWith(videoProcessing);
    expect(dbUpdate).toHaveBeenCalledWith(videoProcessing);
  });
});
