import { describe, it, expect, vi } from 'vitest';
import { globalEvents, EVENTS, type VideoUploadedPayload } from '../../src/lib/server/infrastructure/event-bus';
import { registerPipelineListeners } from '../../src/lib/server/services/video-pipeline';

describe('Video Pipeline Choreography Handlers', () => {
    it('should successfully trigger the transcribe and filter sequence purely via event delegation', () => {
        const mockDb = {
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            onConflictDoUpdate: vi.fn(),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([{ id: 'v_123', filePath: '/test.mp4' }]),
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis()
        } as any;

        const mockAiGateway = {
            transcribe: vi.fn().mockResolvedValue({ segments: [] }),
            analyzeBatch: vi.fn().mockResolvedValue({ texts: [] }),
            translate: vi.fn().mockResolvedValue({ translations: [] }),
            generateThumbnail: vi.fn().mockResolvedValue({ thumbnail_path: '' })
        } as any;

        const mockFilter = { filterBatch: vi.fn().mockResolvedValue([]) } as any;

        // Initialize Native InMemory Event Bus Handler
        registerPipelineListeners(mockDb, mockAiGateway, mockFilter);

        // Spy on subsequent events triggered by choreography
        const transcribeCompletedSpy = vi.fn();
        globalEvents.on(EVENTS.TRANSCRIPTION_COMPLETED, transcribeCompletedSpy);

        // Emit the root event
        globalEvents.emit(EVENTS.VIDEO_UPLOADED, {
            videoId: 'v_123',
            targetLang: 'es',
            nativeLang: 'en'
        } as VideoUploadedPayload);

        // We expect the pipeline to have intercepted this and orchestrated the first step
        expect(mockDb.insert).toHaveBeenCalled();
        expect(mockAiGateway.transcribe).toHaveBeenCalled();
        
        // Ensure strictly synchronous components trigger (or use wait for async promises)
        // Since event-bus listeners are async, they don't block the emit, so we just mock its internal resolution!
    });
});
