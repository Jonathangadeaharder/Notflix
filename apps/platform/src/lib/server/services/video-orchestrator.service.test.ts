import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { IAiGateway } from '../domain/interfaces';
import type { SmartFilter } from './linguistic-filter.service';
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

const MOCK_TITLE = 'Test Video';
const MOCK_TEXT = 'Hola mundo';
const LANG_ES = 'es';
const LANG_EN = 'en';

describe('VideoOrchestratorService', () => {
    const mockVideoId = 'vid-123';
    const mockFilePath = 'uploads/test.mp3';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should complete the full processing pipeline for a guest user', async () => {
        const mockedDb = db as unknown as { limit: { mockResolvedValueOnce: (val: unknown) => void }, set: Mock, update: Mock, where: Mock };

        // Mock Database
        mockedDb.limit.mockResolvedValueOnce([
            { id: mockVideoId, filePath: mockFilePath, title: MOCK_TITLE }
        ]);
        
        // Mock set for update check
        mockedDb.set.mockReturnThis();
        mockedDb.update.mockReturnThis();
        mockedDb.where.mockReturnThis();

        setupAiMocks(LANG_ES);

        const orchestrator = new Orchestrator(aiGateway as unknown as IAiGateway, db as unknown as typeof db, {} as SmartFilter);

        // --- ACT ---
        await orchestrator.processVideo(mockVideoId, LANG_ES, LANG_EN);

        // --- ASSERT ---
        verifyPipelineCalls(mockFilePath, LANG_ES, LANG_EN);
        
        // Verify results were saved
        expect(mockedDb.set).toHaveBeenCalledWith(expect.objectContaining({
            status: 'COMPLETED',
            vttJson: expect.arrayContaining([
                expect.objectContaining({
                    text: MOCK_TEXT,
                    tokens: expect.arrayContaining([
                        expect.objectContaining({ translation: 'Hello' })
                    ])
                })
            ])
        }));
    });

    it('should mark video as ERROR if any step fails', async () => {
        const mockedDb = db as unknown as { limit: { mockResolvedValueOnce: (val: unknown) => void }, set: Mock, update: Mock, where: Mock };

        mockedDb.limit.mockResolvedValueOnce([{ id: mockVideoId, filePath: 'bad.mp4', title: MOCK_TITLE }]);
        vi.mocked(aiGateway.transcribe).mockRejectedValue(new Error('AI Offline'));

        const orchestrator = new Orchestrator(aiGateway as unknown as IAiGateway, db as unknown as typeof db, {} as SmartFilter);

        // --- ACT & ASSERT ---
        await expect(orchestrator.processVideo(mockVideoId)).rejects.toThrow('AI Offline');
        
        expect(mockedDb.set).toHaveBeenCalledWith(expect.objectContaining({
            status: 'ERROR'
        }));
    });
});

function setupAiMocks(es = LANG_ES) {
    const MOCK_PROBABILITY = 0.99;
    const MOCK_SEGMENT_START = 0;
    const MOCK_SEGMENT_END = 2;
    
    vi.mocked(aiGateway.transcribe).mockResolvedValue({
        language: es,
        language_probability: MOCK_PROBABILITY,
        segments: [{ start: MOCK_SEGMENT_START, end: MOCK_SEGMENT_END, text: MOCK_TEXT }]
    });

    vi.mocked(aiGateway.analyzeBatch).mockResolvedValue({
        results: [[{ text: 'Hola', lemma: 'hola', pos: 'INTJ', is_stop: false }]]
    });

    vi.mocked(aiGateway.translate).mockResolvedValue({
        translations: ['Hello']
    });

    vi.mocked(aiGateway.generateThumbnail).mockResolvedValue({
        thumbnail_path: 'thumb.jpg'
    });
}

function verifyPipelineCalls(mockFilePath: string, es: string, en: string) {
    expect(aiGateway.transcribe).toHaveBeenCalledWith(mockFilePath, es);
    expect(aiGateway.analyzeBatch).toHaveBeenCalledWith([MOCK_TEXT], es);
    expect(aiGateway.translate).toHaveBeenCalledWith(['hola'], es, en);
}