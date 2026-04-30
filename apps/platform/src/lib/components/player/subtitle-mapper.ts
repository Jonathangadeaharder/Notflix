import type { DbTokenAnalysis, DbVttSegment } from '$lib/server/db/schema';
import type { Subtitle, WordData } from './types';

type SegmentWithTranslation = DbVttSegment & { translation?: string };
type TokenWithLearningState = DbTokenAnalysis & { isKnown?: boolean };

function mapWordDifficulty(
  token: TokenWithLearningState,
  classification?: Subtitle['classification'],
): WordData['difficulty'] {
  if (token.isKnown) {
    return 'easy';
  }

  if (classification === 'LEARNING') {
    return 'learning';
  }

  if (classification === 'HARD') {
    return 'hard';
  }

  return 'easy';
}

function buildWordBreakdown(token: TokenWithLearningState): string | undefined {
  const details = [token.pos];
  if (token.isKnown !== undefined) {
    details.push(token.isKnown ? 'Known' : 'Unknown');
  }

  return details.join(' • ');
}

function buildFallbackTranslation(segment: SegmentWithTranslation): string {
  return segment.tokens
    .map(
      (token) => (token.translation || token.text) + (token.whitespace || ''),
    )
    .join('')
    .trim();
}

export function mapSegmentsToPlayerSubtitles(
  segments: SegmentWithTranslation[] | null | undefined,
): Subtitle[] {
  if (!segments) {
    return [];
  }

  return segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    text: segment.text,
    translation: segment.translation || buildFallbackTranslation(segment),
    classification: segment.classification as Subtitle['classification'],
    words: segment.tokens.map((token) => ({
      text: token.text,
      difficulty: mapWordDifficulty(
        token as TokenWithLearningState,
        segment.classification as Subtitle['classification'],
      ),
      lemma: token.lemma,
      translation: token.translation,
      breakdown: buildWordBreakdown(token as TokenWithLearningState),
      whitespace: token.whitespace,
      isKnown: (token as TokenWithLearningState).isKnown,
      partOfSpeech: token.pos,
    })),
  }));
}
