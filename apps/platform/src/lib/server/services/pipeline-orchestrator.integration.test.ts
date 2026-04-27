import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { video, videoProcessing } from '$lib/server/db/schema';
import { db } from '../infrastructure/database';
import { eventBus } from '../infrastructure/event-bus';
import { orchestrator } from './pipeline-orchestrator'; // Ensure it's imported to register the listener

// Mock the AI gateway used inside PipelineOrchestrator
vi.mock('../adapters/real-ai-gateway', () => ({
  RealAiGateway: vi.fn().mockImplementation(function (this: any) {
    this.generateThumbnail = vi
      .fn()
      .mockResolvedValue({ thumbnail_path: 'thumb.jpg' });
    this.transcribe = vi.fn().mockResolvedValue({
      language: 'es',
      language_probability: 0.99,
      segments: [{ start: 0, end: 1, text: 'Hola mundo' }],
    });
    this.transcribeWithProgress = vi
      .fn()
      .mockImplementation(
        async (_filePath: string, _lang: string, onProgress: any) => {
          if (onProgress) await onProgress(50);
          return {
            language: 'es',
            language_probability: 0.99,
            segments: [{ start: 0, end: 1, text: 'Hola mundo' }],
          };
        },
      );
    this.analyzeBatch = vi.fn().mockResolvedValue({
      results: [[{ text: 'Hola', lemma: 'hola', pos: 'INTJ', is_stop: false }]],
    });
    this.translate = vi
      .fn()
      .mockResolvedValue({ translations: ['Hello world'] });
  }),
}));

// Mock SmartFilter to avoid real DB knowledge lookups
vi.mock('./linguistic-filter.service', () => ({
  SmartFilter: vi.fn().mockImplementation(function (this: any) {
    this.filterBatch = vi.fn().mockResolvedValue([
      {
        classification: 'LEARNING',
        tokens: [
          {
            text: 'Hola',
            lemma: 'hola',
            pos: 'INTJ',
            is_stop: false,
            isKnown: false,
          },
        ],
      },
    ]);
  }),
}));

describe('Pipeline Orchestrator Integration', () => {
  const testVideoId = crypto.randomUUID();
  const testFilePath = '/app/media/test_vid.mp4';

  beforeAll(async () => {
    // The import at the top registers the listener
    expect(orchestrator).toBeDefined();

    await db.insert(video).values({
      id: testVideoId,
      title: 'Pipeline Integration Test Video',
      filePath: testFilePath,
    });
  });

  afterAll(async () => {
    await db
      .delete(videoProcessing)
      .where(eq(videoProcessing.videoId, testVideoId));
    await db.delete(video).where(eq(video.id, testVideoId));
  });

  it('should process a video through the full pipeline when event is emitted', async () => {
    const processCompleted = new Promise<void>((resolve) => {
      eventBus.once('video.processing.completed', (payload) => {
        if (payload.videoId === testVideoId) {
          resolve();
        }
      });
    });

    // We emit the event as if a request triggered it
    await eventBus.emitAsync('video.processing.started', {
      videoId: testVideoId,
      targetLang: 'es',
      nativeLang: 'en',
      userId: 'test-user-id',
    });

    // Wait for the pipeline to finish processing
    await processCompleted;

    const processingRecord = await db
      .select()
      .from(videoProcessing)
      .where(eq(videoProcessing.videoId, testVideoId));

    expect(processingRecord).toHaveLength(1);
    expect(processingRecord[0].status).toBe('COMPLETED');
    expect(processingRecord[0].vttJson).toBeDefined();

    const segments = processingRecord[0].vttJson as Array<{ text: string }>;
    expect(segments[0].text).toBe('Hola mundo');
  });
});
