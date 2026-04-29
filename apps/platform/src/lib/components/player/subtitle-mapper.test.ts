import { describe, expect, it } from 'vitest';
import { mapSegmentsToPlayerSubtitles } from './subtitle-mapper';

describe('mapSegmentsToPlayerSubtitles', () => {
  it('WhenNullInput_ThenReturnsEmptyArray', () => {
    expect(mapSegmentsToPlayerSubtitles(null)).toEqual([]);
    expect(mapSegmentsToPlayerSubtitles(undefined)).toEqual([]);
  });

  it('WhenLearningState_ThenMapsDifficultyAndBreakdown', () => {
    const subtitles = mapSegmentsToPlayerSubtitles([
      {
        start: 0,
        end: 2,
        text: 'Hola mundo',
        translation: 'Hello world',
        classification: 'LEARNING',
        tokens: [
          {
            text: 'Hola',
            lemma: 'hola',
            pos: 'INTJ',
            is_stop: false,
            isKnown: false,
            translation: 'Hello',
            whitespace: ' ',
          },
          {
            text: 'mundo',
            lemma: 'mundo',
            pos: 'NOUN',
            is_stop: false,
            isKnown: true,
            translation: 'world',
          },
        ],
      },
    ]);

    expect(subtitles).toHaveLength(1);
    expect(subtitles[0].translation).toBe('Hello world');
    expect(subtitles[0].words?.[0].difficulty).toBe('learning');
    expect(subtitles[0].words?.[1].difficulty).toBe('easy');
    expect(subtitles[0].words?.[0].breakdown).toBe('INTJ • Unknown');
    expect(subtitles[0].words?.[1].breakdown).toBe('NOUN • Known');
  });

  it('WhenHardClassification_ThenDifficultyHard', () => {
    const subtitles = mapSegmentsToPlayerSubtitles([
      {
        start: 0,
        end: 1,
        text: 'difícil',
        classification: 'HARD',
        tokens: [
          { text: 'difícil', lemma: 'difícil', pos: 'ADJ', is_stop: false },
        ],
      },
    ]);
    expect(subtitles[0].words?.[0].difficulty).toBe('hard');
  });

  it('WhenEasyClassification_ThenDifficultyEasy', () => {
    const subtitles = mapSegmentsToPlayerSubtitles([
      {
        start: 0,
        end: 1,
        text: 'casa',
        classification: 'EASY',
        tokens: [{ text: 'casa', lemma: 'casa', pos: 'NOUN', is_stop: false }],
      },
    ]);
    expect(subtitles[0].words?.[0].difficulty).toBe('easy');
  });

  it('WhenNoClassificationAndNotKnown_ThenDifficultyEasy', () => {
    const subtitles = mapSegmentsToPlayerSubtitles([
      {
        start: 0,
        end: 1,
        text: 'palabra',
        tokens: [
          {
            text: 'palabra',
            lemma: 'palabra',
            pos: 'NOUN',
            is_stop: false,
            isKnown: false,
          },
        ],
      },
    ]);
    // No classification, not known → default "easy"
    expect(subtitles[0].words?.[0].difficulty).toBe('easy');
  });

  it('WhenMissingIsKnown_ThenBreakdownOmitsStatus', () => {
    const subtitles = mapSegmentsToPlayerSubtitles([
      {
        start: 0,
        end: 1,
        text: 'test',
        tokens: [{ text: 'test', lemma: 'test', pos: 'VERB', is_stop: false }],
      },
    ]);
    // isKnown is undefined, so breakdown only has pos
    expect(subtitles[0].words?.[0].breakdown).toBe('VERB');
  });

  it('WhenMissingTranslation_ThenFallsBackToTokenTexts', () => {
    const subtitles = mapSegmentsToPlayerSubtitles([
      {
        start: 0,
        end: 1,
        text: 'Hola mundo',
        // No translation field → buildFallbackTranslation
        tokens: [
          {
            text: 'Hola',
            lemma: 'hola',
            pos: 'INTJ',
            is_stop: false,
            translation: 'Hello',
            whitespace: ' ',
          },
          {
            text: 'mundo',
            lemma: 'mundo',
            pos: 'NOUN',
            is_stop: false,
            // No translation → falls back to text
            whitespace: '',
          },
        ],
      },
    ]);
    // Fallback: "Hello" + " " + "mundo" + "" = "Hello mundo"
    expect(subtitles[0].translation).toBe('Hello mundo');
  });

  it('WhenMultipleSegments_ThenPreservesOrder', () => {
    const subtitles = mapSegmentsToPlayerSubtitles([
      {
        start: 0,
        end: 1,
        text: 'first',
        tokens: [
          { text: 'first', lemma: 'first', pos: 'NOUN', is_stop: false },
        ],
      },
      {
        start: 1,
        end: 2,
        text: 'second',
        tokens: [
          { text: 'second', lemma: 'second', pos: 'NOUN', is_stop: false },
        ],
      },
    ]);
    expect(subtitles).toHaveLength(2);
    expect(subtitles[0].text).toBe('first');
    expect(subtitles[1].text).toBe('second');
  });
});
