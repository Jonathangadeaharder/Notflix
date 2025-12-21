import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiGateway } from '../infrastructure/container';
import { db } from '../infrastructure/database';
import { Orchestrator } from './video-orchestrator.service';

// Mock dependencies
vi.mock('../infrastructure/container', () => ({
    aiGateway: {
        transcribe: vi.fn(),
        analyzeBatch: vi.fn(),
        translate: vi.fn(),
        generateThumbnail: vi.fn()
    },
    orchestrator: {},
    smartFilter: {},
    subtitleService: {}
}));

vi.mock('../infrastructure/database', () => ({
    db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    }
}));

describe('VideoOrchestratorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should complete the full processing pipeline for a guest user', async () => {
        // --- ARRANGE ---
        const mockVideoId = 'vid-123';
        const mockFilePath = 'uploads/test.mp3';
        const mockedDb = db as any;

        // Mock Database: return video record
        mockedDb.limit.mockResolvedValueOnce([
            { id: mockVideoId, filePath: mockFilePath, title: 'Test Video' }
        ]);

        // Mock AI: Transcribe
        vi.mocked(aiGateway.transcribe).mockResolvedValue({
            language: 'es',
            language_probability: 0.99,
            segments: [{ start: 0, end: 2, text: 'Hola mundo' }]
        });

        // Mock AI: Analyze (Linguistic)
        vi.mocked(aiGateway.analyzeBatch).mockResolvedValue({
            results: [[{ text: 'Hola', lemma: 'hola', pos: 'INTJ', is_stop: false }]]
        });

        // Mock AI: Translate (for guest lemmas)
        vi.mocked(aiGateway.translate).mockResolvedValue({
            translations: ['Hello']
        });

        // Mock AI: Thumbnail
        vi.mocked(aiGateway.generateThumbnail).mockResolvedValue({
            thumbnail_path: 'thumb.jpg'
        });

        const orchestrator = new Orchestrator(aiGateway as any, db as any);

        // --- ACT ---
        await orchestrator.processVideo(mockVideoId, 'es', 'en');

        // --- ASSERT ---
        // 1. Verify the pipeline stages were called correctly
        expect(aiGateway.transcribe).toHaveBeenCalledWith(mockFilePath, 'es');
        expect(aiGateway.analyzeBatch).toHaveBeenCalledWith(['Hola mundo'], 'es');
        expect(aiGateway.translate).toHaveBeenCalledWith(['hola'], 'es', 'en');
        
        // 2. Verify results were saved to the database
        // Final save call should contain the enriched JSON
        expect(mockedDb.set).toHaveBeenCalledWith(expect.objectContaining({
            status: 'COMPLETED',
            vttJson: expect.arrayContaining([
                expect.objectContaining({
                    text: 'Hola mundo',
                    tokens: expect.arrayContaining([
                        expect.objectContaining({ translation: 'Hello' })
                    ])
                })
            ])
        }));
    });

    it('should mark video as ERROR if any step fails', async () => {
        // --- ARRANGE ---
        const mockVideoId = 'vid-fail';
        const mockedDb = db as any;

        mockedDb.limit.mockResolvedValueOnce([{ id: mockVideoId, filePath: 'bad.mp4' }]);
        vi.mocked(aiGateway.transcribe).mockRejectedValue(new Error('AI Offline'));

        const orchestrator = new Orchestrator(aiGateway as any, db as any);

        // --- ACT & ASSERT ---
        await expect(orchestrator.processVideo(mockVideoId)).rejects.toThrow('AI Offline');
        
        expect(mockedDb.set).toHaveBeenCalledWith(expect.objectContaining({
            status: 'ERROR'
        }));
    });
});