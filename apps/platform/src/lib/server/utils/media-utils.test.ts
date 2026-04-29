import { describe, expect, it } from 'vitest';
import { calculateChunks, toMediaUrl } from './media-utils';

describe('toMediaUrl', () => {
  it('WhenNullOrUndefined_ThenReturnsEmptyString', () => {
    expect(toMediaUrl(null)).toBe('');
    expect(toMediaUrl(undefined)).toBe('');
  });

  it('WhenHttpUrl_ThenPassthrough', () => {
    expect(toMediaUrl('http://example.com/video.mp4')).toBe(
      'http://example.com/video.mp4',
    );
    expect(toMediaUrl('https://example.com/video.mp4')).toBe(
      'https://example.com/video.mp4',
    );
  });

  it('WhenAlreadyMediaPrefixed_ThenPassthrough', () => {
    expect(toMediaUrl('/media/uploads/video.mp4')).toBe(
      '/media/uploads/video.mp4',
    );
  });
});

describe('calculateChunks', () => {
  it('WhenZeroOrNegativeDuration_ThenReturnsEmpty', () => {
    expect(calculateChunks(0, 30)).toEqual([]);
    expect(calculateChunks(-10, 30)).toEqual([]);
  });

  it('WhenZeroOrNegativeChunkSize_ThenReturnsEmpty', () => {
    expect(calculateChunks(120, 0)).toEqual([]);
    expect(calculateChunks(120, -5)).toEqual([]);
  });

  it('WhenDurationFitsInOneChunk_ThenReturnsSingleSpan', () => {
    const chunks = calculateChunks(20, 30);
    expect(chunks).toEqual([{ start: 0, end: 20 }]);
  });

  it('WhenMultipleChunks_ThenHasOverlap', () => {
    const chunks = calculateChunks(60, 30);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toEqual({ start: 0, end: 30 });
    // Next chunk starts 0.5s before previous end (overlap)
    expect(chunks[1].start).toBe(29.5);
  });

  it('WhenLastChunkTooSmall_ThenMergedIntoPrevious', () => {
    // 61 seconds with 30s chunks: [0,30], [29.5,59.5], [59,61] → last is 2s (≥1), so kept
    // 60.5 seconds: [0,30], [29.5,59.5], [59,60.5] → last is 1.5s, kept
    // Let's find a case where last < 1.0s:
    const chunks = calculateChunks(30.3, 30);
    // [0,30], [29.5,30.3] → last is 0.8s (< 1.0), so merged
    expect(chunks).toHaveLength(1);
    expect(chunks[0].end).toBe(30.3);
  });

  it('WhenSlicesVideoWith30sChunks_ThenCoversFullDuration', () => {
    const chunks = calculateChunks(120, 30);
    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk.end).toBe(120);
  });
});
