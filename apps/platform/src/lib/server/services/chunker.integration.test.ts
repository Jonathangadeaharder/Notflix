import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../infrastructure/database';
import { video, videoProcessing, user, knownWords } from '@notflix/database';
import { eq, and } from 'drizzle-orm';
import { generateDeck } from './chunker.service';
import type { VttSegment } from './video-orchestrator.service';

describe('ChunkerService Integration (Real DB)', () => {
    const testUserId = crypto.randomUUID();
    const testVideoId = crypto.randomUUID();
    const testTargetLang = 'es';

    beforeAll(async () => {
        // 1. Create a User (Required for Known Words FK)
        await db.insert(user).values({
            id: testUserId,
            name: 'Integration Test User',
            email: `test-${testUserId}@example.com`,
            emailVerified: true,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // 2. Create a Video
        await db.insert(video).values({
            id: testVideoId,
            title: 'Chunker Integration Video',
            filePath: '/tmp/chunker_test.mp4',
            thumbnailPath: '/tmp/thumb.jpg',
            views: 0,
            published: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // 3. Create Processing Result with VTT
        // "The cat sits."
        const vttData: VttSegment[] = [
            {
                start: 0,
                end: 5,
                text: "El gato se sienta.",
                tokens: [
                    { text: "El", lemma: "el", pos: "DET", is_stop: true },
                    { text: "gato", lemma: "gato", pos: "NOUN", is_stop: false },
                    { text: "se", lemma: "se", pos: "PRON", is_stop: true },
                    { text: "sienta", lemma: "sentar", pos: "VERB", is_stop: false }
                ]
            }
        ];

        await db.insert(videoProcessing).values({
            videoId: testVideoId,
            targetLang: testTargetLang,
            status: 'COMPLETED',
            progress: 100,
            vttJson: vttData,
            updatedAt: new Date()
        });

        // 4. Mark "sentar" as Known
        await db.insert(knownWords).values({
            userId: testUserId,
            lang: testTargetLang,
            lemma: 'sentar',
            score: 5,
            lastReviewed: new Date()
        });
    });

    afterAll(async () => {
        // Cleanup in order (FK constraints)
        await db.delete(knownWords).where(eq(knownWords.userId, testUserId));
        await db.delete(videoProcessing).where(eq(videoProcessing.videoId, testVideoId));
        await db.delete(video).where(eq(video.id, testVideoId));
        await db.delete(user).where(eq(user.id, testUserId));
    });

    it('should generate a deck from real DB data with correct known status', async () => {
        // ACT
        // Request chunk 0-5s
        const deck = await generateDeck(
            testUserId,
            testVideoId,
            0,
            5,
            testTargetLang
        );

        // ASSERT
        // Should contain 'gato' (NOUN) and 'sentar' (VERB)
        // 'el' and 'se' are stop words/not CONTENT_POS
        expect(deck).toHaveLength(2);

        const gatoCard = deck.find(c => c.lemma === 'gato');
        const sentarCard = deck.find(c => c.lemma === 'sentar');

        expect(gatoCard).toBeDefined();
        expect(gatoCard?.isKnown).toBe(false); // Unknown

        expect(sentarCard).toBeDefined();
        expect(sentarCard?.isKnown).toBe(true); // Known via DB
        expect(sentarCard?.original).toBe('sienta');
        expect(sentarCard?.contextSentence).toBe('El gato se sienta.'); // Context check
    });

    it('should return empty deck for out-of-range chunk', async () => {
        const deck = await generateDeck(
            testUserId,
            testVideoId,
            100,
            105,
            testTargetLang
        );
        expect(deck).toEqual([]);
    });
});
