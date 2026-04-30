import { describe, expect, it, vi } from 'vitest';
import * as knowledgeService from './knowledge.service';
import {
  SegmentClassification,
  SmartFilter,
} from './linguistic-filter.service';

vi.mock('./knowledge.service', () => ({
  getKnownLemmas: vi.fn(),
}));

describe('SmartFilter', () => {
  it('should classify EASY when all words are known', async () => {
    vi.mocked(knowledgeService.getKnownLemmas).mockResolvedValue(
      new Set(['gato', 'bebe', 'leche']),
    );

    const filter = new SmartFilter({} as any);
    const tokens = [
      { text: 'El', lemma: 'el', pos: 'DET', is_stop: true, whitespace: ' ' },
      {
        text: 'gato',
        lemma: 'gato',
        pos: 'NOUN',
        is_stop: false,
        whitespace: ' ',
      },
      {
        text: 'bebe',
        lemma: 'bebe',
        pos: 'VERB',
        is_stop: false,
        whitespace: ' ',
      },
      {
        text: 'leche',
        lemma: 'leche',
        pos: 'NOUN',
        is_stop: false,
        whitespace: '',
      },
    ];

    const result = await filter.filterSegment(tokens, 'user1', 'es');

    expect(result.classification).toBe(SegmentClassification.EASY);
    expect(result.unknownCount).toBe(0);
    expect(result.tokens.every((t) => t.isKnown)).toBe(true);
  });

  it('should classify LEARNING when there is a manageable unknown ratio', async () => {
    vi.mocked(knowledgeService.getKnownLemmas).mockResolvedValue(
      new Set(['bebe', 'leche']),
    );

    const filter = new SmartFilter({} as any);
    const tokens = [
      { text: 'El', lemma: 'el', pos: 'DET', is_stop: true, whitespace: ' ' },
      {
        text: 'murciélago',
        lemma: 'murciélago',
        pos: 'NOUN',
        is_stop: false,
        whitespace: ' ',
      }, // Unknown
      {
        text: 'bebe',
        lemma: 'bebe',
        pos: 'VERB',
        is_stop: false,
        whitespace: ' ',
      },
      {
        text: 'leche',
        lemma: 'leche',
        pos: 'NOUN',
        is_stop: false,
        whitespace: '',
      },
    ];

    const result = await filter.filterSegment(tokens, 'user1', 'es');

    expect(result.classification).toBe(SegmentClassification.LEARNING);
    expect(result.unknownCount).toBe(1);
  });

  it('should classify HARD when too many unknown words exist', async () => {
    vi.mocked(knowledgeService.getKnownLemmas).mockResolvedValue(new Set([]));

    const filter = new SmartFilter({} as any);
    const tokens = Array(15).fill({
      text: 'palabra',
      lemma: 'palabra',
      pos: 'NOUN',
      is_stop: false,
      whitespace: ' ',
    });

    const result = await filter.filterSegment(tokens, 'user1', 'es');

    expect(result.classification).toBe(SegmentClassification.HARD);
    expect(result.unknownCount).toBe(15);
  });
});
