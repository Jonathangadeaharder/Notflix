import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDeck } from './chunker.service';
import { db } from '../infrastructure/database';

// Mock DB
vi.mock('../infrastructure/database', () => ({
    db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
    }
}));

describe('ChunkerService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate a deck containing both known and unknown words from a sentence', async () => {
        // --- ARRANGE ---
        const mockedDb = db as any;
        const mockUserId = 'user-1';
        const mockVideoId = 'vid-1';

        // 1. Mock fetchVttData: The sentence "The cat runs."
        const mockVtt = [
            {
                start: 0, end: 10, text: "The cat runs.",
                tokens: [
                    { text: "cat", lemma: "cat", pos: "NOUN", is_stop: false }, 
                    { text: "runs", lemma: "run", pos: "VERB", is_stop: false }
                ]
            }
        ];
        mockedDb.limit.mockResolvedValueOnce([{ vttJson: mockVtt }]);

        // 2. Mock fetchKnownLemmas: Only "run" is known
        const mockKnownResult = [{ lemma: "run" }];
        mockedDb.where
            .mockReturnValueOnce(db as never) // First call: select vtt
            .mockResolvedValueOnce(mockKnownResult); // Second call: select known words

        // --- ACT ---
        const deck = await generateDeck(mockUserId, mockVideoId, 0, 100, 'en');

        // --- ASSERT ---
        expect(deck.length).toBe(2);
        
        const catCard = deck.find(c => c.lemma === 'cat');
        const runCard = deck.find(c => c.lemma === 'run');

        expect(catCard).toBeDefined();
        expect(catCard?.isKnown).toBe(false);
        expect(catCard?.contextSentence).toBe("The cat runs.");

        expect(runCard).toBeDefined();
        expect(runCard?.isKnown).toBe(true);
    });

    it('should return an empty array if no segments are found in the time range', async () => {
        // --- ARRANGE ---
        const mockedDb = db as any;
        mockedDb.limit.mockResolvedValueOnce([{ vttJson: [] }]);

        // --- ACT ---
        const deck = await generateDeck('u1', 'v1', 500, 600, 'en');

        // --- ASSERT ---
        expect(deck).toEqual([]);
    });
});