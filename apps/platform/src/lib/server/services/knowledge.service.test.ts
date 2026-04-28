import { describe, expect, it, vi } from 'vitest';
import { getKnownLemmas } from './knowledge.service';

describe('getKnownLemmas', () => {
  const USER_ID = 'user-1';
  const TARGET_LANG = 'es';

  it('returns empty set for empty lemma list', async () => {
    // Empty lemma list short-circuits before any DB call, so default db ref
    // is never read. No mock needed.
    const result = await getKnownLemmas(USER_ID, TARGET_LANG, [], {} as any);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('returns set of known lemmas from database', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ lemma: 'gato' }, { lemma: 'perro' }]),
    };

    const result = await getKnownLemmas(
      USER_ID,
      TARGET_LANG,
      ['gato', 'perro', 'casa'],
      mockDb as any,
    );
    expect(result).toBeInstanceOf(Set);
    expect(result.has('gato')).toBe(true);
    expect(result.has('perro')).toBe(true);
    expect(result.has('casa')).toBe(false);
  });

  it('deduplicates input lemmas', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ lemma: 'gato' }]),
    };

    const result = await getKnownLemmas(
      USER_ID,
      TARGET_LANG,
      ['gato', 'gato', 'gato'],
      mockDb as any,
    );
    expect(result.size).toBe(1);
    expect(result.has('gato')).toBe(true);
  });
});
