import { describe, expect, it, vi } from 'vitest';
import { generateDeck } from './chunker.service';

describe('ChunkerService', () => {
  it('should generate a deck containing both known and unknown words from a sentence', async () => {
    // VTT row returned by the first select().from().where().limit().
    const mockVtt = [
      {
        start: 0,
        end: 10,
        text: 'The cat runs.',
        tokens: [
          { text: 'cat', lemma: 'cat', pos: 'NOUN', is_stop: false },
          { text: 'runs', lemma: 'run', pos: 'VERB', is_stop: false },
        ],
      },
    ];

    // First chain awaits .limit() (vtt fetch), second chain awaits .where()
    // (knowledge fetch — no .limit). Build a single mock that returns the
    // right value on each terminal `await`.
    const limit = vi.fn().mockResolvedValueOnce([{ vttJson: mockVtt }]);
    const where = vi
      .fn()
      .mockReturnValueOnce({ limit })
      .mockResolvedValueOnce([{ lemma: 'run' }]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const mockDb = { select } as any;

    const TEST_START = 0;
    const TEST_END = 100;
    const deck = await generateDeck(
      'user-1',
      'vid-1',
      TEST_START,
      TEST_END,
      'en',
      undefined,
      mockDb,
    );

    const EXPECTED_COUNT = 2;
    expect(deck).toHaveLength(EXPECTED_COUNT);

    const catCard = deck.find((c) => c.lemma === 'cat');
    const runCard = deck.find((c) => c.lemma === 'run');

    expect(catCard).toBeDefined();
    expect(catCard?.isKnown).toBe(false);
    expect(catCard?.contextSentence).toBe('The cat runs.');

    expect(runCard).toBeDefined();
    expect(runCard?.isKnown).toBe(true);
  });

  it('should return an empty array if no segments are found in the time range', async () => {
    const limit = vi.fn().mockResolvedValueOnce([{ vttJson: [] }]);
    const where = vi.fn().mockReturnValueOnce({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const mockDb = { select } as any;

    const TEST_START = 500;
    const TEST_END = 600;
    const deck = await generateDeck(
      'u1',
      'v1',
      TEST_START,
      TEST_END,
      'en',
      undefined,
      mockDb,
    );

    expect(deck).toEqual([]);
  });
});
