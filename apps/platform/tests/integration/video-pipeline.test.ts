import { describe, it, expect, vi } from 'vitest';
import { processVideo } from '../../src/lib/server/services/video-pipeline';

// Mock AI gateway and filter so the sequential pipeline can run without real services
vi.mock('../../src/lib/server/adapters/real-ai-gateway', () => ({
    RealAiGateway: vi.fn().mockImplementation(function (this: any) {
        this.transcribeWithProgress = vi.fn().mockImplementation(async (_path, _lang, cb) => {
            if (cb) await cb(100);
            return { segments: [{ start: 0, end: 1, text: 'Hola' }], language: 'es', language_probability: 1 };
        });
        this.analyzeBatch = vi.fn().mockResolvedValue({ results: [[{ text: 'Hola', lemma: 'hola', pos: 'INTJ', is_stop: false }]] });
        this.translate = vi.fn().mockResolvedValue({ translations: ['Hello'] });
        this.generateThumbnail = vi.fn().mockResolvedValue({ thumbnail_path: '' });
    }),
}));

vi.mock('../../src/lib/server/services/linguistic-filter.service', () => ({
    SmartFilter: vi.fn().mockImplementation(function (this: any) {
        this.filterBatch = vi.fn().mockResolvedValue([
            { classification: 'LEARNING', tokens: [{ text: 'Hola', lemma: 'hola', pos: 'INTJ', is_stop: false, isKnown: false }] },
        ]);
    }),
}));

describe('processVideo sequential pipeline', () => {
    it('should call transcribe, analyze, and translate steps', async () => {
        const mockDb = {
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            onConflictDoUpdate: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([{ id: 'v1', filePath: '/test.mp4' }]),
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
        } as any;

        await processVideo('v1', 'es', 'en', 'user-1', mockDb);

        // Verify DB was updated to COMPLETED
        expect(mockDb.update).toHaveBeenCalled();
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED' }));
    });
});
