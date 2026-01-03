import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { db } from '../infrastructure/database';
import { video, videoProcessing } from '@notflix/database';
import { eq } from 'drizzle-orm';
import { Orchestrator } from './video-orchestrator.service';
import { SmartFilter } from './linguistic-filter.service';
import type { IAiGateway } from '../domain/interfaces';

// Mock AI Gateway to isolate testing of DB persistence logic
const mockAiGateway: IAiGateway = {
    generateThumbnail: vi.fn().mockResolvedValue({ thumbnail_path: 'thumb.jpg' }),
    transcribe: vi.fn().mockResolvedValue({
        language: 'es',
        language_probability: 0.99,
        segments: [{ start: 0, end: 1, text: 'Hola mundo' }]
    }),
    analyzeBatch: vi.fn().mockResolvedValue({
        results: [[{ text: 'Hola', lemma: 'hola', pos: 'INTJ', is_stop: false }]]
    }),
    translate: vi.fn().mockResolvedValue({ translations: ['Hello world'] })
};

describe('VideoOrchestratorService Integration', () => {
    let orchestrator: Orchestrator;
    const testVideoId = crypto.randomUUID();
    const testFilePath = '/app/media/test_vid.mp4'; // Dummy path

    beforeAll(async () => {
        // Ensure clean state or setup if needed
        // Assuming DB is running and schema applied via migration or push
        orchestrator = new Orchestrator(mockAiGateway, db, new SmartFilter(db));
    });

    it('should persist processing results to the real database', async () => {
        // 1. Arrange: Insert a video record
        await db.insert(video).values({
            id: testVideoId,
            title: 'Integration Test Video',
            filePath: testFilePath
        });

        // 2. Act: Process the video
        await orchestrator.processVideo(testVideoId, 'es', 'en');

        // 3. Assert: Check DB for results
        const processingRecord = await db.select()
            .from(videoProcessing)
            .where(eq(videoProcessing.videoId, testVideoId));

        expect(processingRecord).toHaveLength(1);
        expect(processingRecord[0].status).toBe('COMPLETED');
        expect(processingRecord[0].vttJson).toBeDefined();

        // precise check on json content if possible
        const segments = processingRecord[0].vttJson as any[];
        expect(segments[0].text).toBe('Hola mundo');
    });

    afterAll(async () => {
        // Cleanup
        await db.delete(videoProcessing).where(eq(videoProcessing.videoId, testVideoId));
        await db.delete(video).where(eq(video.id, testVideoId));
    });
});
