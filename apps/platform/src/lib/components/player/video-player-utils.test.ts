import { describe, expect, it } from 'vitest';
import type { Subtitle } from './types';
import {
  calcProgressPercent,
  calculateNextInterrupt,
  formatTime,
  getMediaErrorMessage,
  getNextSubtitleMode,
  getTranscriptItemClass,
  isAudioFile,
  MEDIA_ERR_ABORTED,
  MEDIA_ERR_DECODE,
  MEDIA_ERR_NETWORK,
  MEDIA_ERR_SRC_NOT_SUPPORTED,
  markWordKnown,
  shouldReportProgress,
} from './video-player-utils';

const TEST_TIMEOUT_MS = 5000;

describe('formatTime', () => {
  it('WhenZero_ThenReturnsZeroWithZeroSeconds', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('When65Seconds_ThenReturnsOneColonZeroFive', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('When3661Seconds_ThenReturnsHourFormat', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(3661)).toBe('1:01:01');
  });

  it('WhenNaN_ThenReturnsZeroColonZeroZero', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('WhenNegative_ThenReturnsZeroColonZeroZero', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(-10)).toBe('0:00');
  });

  it('WhenNegativeInfinity_ThenReturnsZeroColonZeroZero', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(-Infinity)).toBe('0:00');
  });

  it('WhenPositiveInfinity_ThenReturnsZeroColonZeroZero', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(Infinity)).toBe('0:00');
  });

  it('WhenExactlyOneHour_ThenReturnsOneHourFormat', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(3600)).toBe('1:00:00');
  });

  it('When59Seconds_ThenReturnsZeroColon59', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(formatTime(59)).toBe('0:59');
  });
});

describe('getMediaErrorMessage', () => {
  it('WhenAbortedCode_ThenReturnsAbortedMessage', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getMediaErrorMessage(MEDIA_ERR_ABORTED)).toBe(
      'Playback aborted by user.',
    );
  });

  it('WhenNetworkCode_ThenReturnsNetworkMessage', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getMediaErrorMessage(MEDIA_ERR_NETWORK)).toBe(
      'Network error while downloading.',
    );
  });

  it('WhenDecodeCode_ThenReturnsDecodeMessage', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getMediaErrorMessage(MEDIA_ERR_DECODE)).toBe(
      'Video playback aborted due to a corruption problem or because the video used features your browser did not support.',
    );
  });

  it('WhenSrcNotSupportedCode_ThenReturnsSrcNotSupportedMessage', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getMediaErrorMessage(MEDIA_ERR_SRC_NOT_SUPPORTED)).toBe(
      'The video could not be loaded, either because the server or network failed or because the format is not supported (File might be missing).',
    );
  });

  it('WhenUnknownCode_ThenReturnsDefaultMessage', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getMediaErrorMessage(99)).toBe('Unknown error occurred');
  });

  it('WhenZeroCode_ThenReturnsDefaultMessage', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getMediaErrorMessage(0)).toBe('Unknown error occurred');
  });
});

describe('getNextSubtitleMode', () => {
  it('WhenOff_ThenReturnsFiltered', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(getNextSubtitleMode('OFF')).toBe('FILTERED');
  });

  it('WhenFiltered_ThenReturnsDual', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(getNextSubtitleMode('FILTERED')).toBe('DUAL');
  });

  it('WhenDual_ThenReturnsOriginal', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(getNextSubtitleMode('DUAL')).toBe('ORIGINAL');
  });

  it('WhenOriginal_ThenWrapsToOff', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(getNextSubtitleMode('ORIGINAL')).toBe('OFF');
  });
});

describe('isAudioFile', () => {
  it('WhenMp3_ThenReturnsTrue', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(isAudioFile('song.mp3')).toBe(true);
  });

  it('WhenM4a_ThenReturnsTrue', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(isAudioFile('audio.m4a')).toBe(true);
  });

  it('WhenUpperCasedExtension_ThenReturnsTrue', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(isAudioFile('song.MP3')).toBe(true);
  });

  it('WhenMp4_ThenReturnsFalse', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(isAudioFile('video.mp4')).toBe(false);
  });

  it('WhenWav_ThenReturnsTrue', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(isAudioFile('audio.wav')).toBe(true);
  });

  it('WhenEmptyString_ThenReturnsFalse', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(isAudioFile('')).toBe(false);
  });

  it('WhenUndefined_ThenReturnsFalse', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(isAudioFile(undefined as unknown as string)).toBe(false);
  });

  it('WhenPathWithDirs_ThenReturnsTrue', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(isAudioFile('/media/uploads/file.mp3')).toBe(true);
  });

  it('WhenUrlWithQueryString_ThenDetectsAudio', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(isAudioFile('track.mp3?token=abc')).toBe(true);
    expect(isAudioFile('song.m4a#t=12')).toBe(true);
  });
});

describe('calculateNextInterrupt', () => {
  it('WhenPositiveInterval_ThenMultipliesByChunkPlusOne', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(calculateNextInterrupt(60, 0)).toBe(60);
    expect(calculateNextInterrupt(60, 2)).toBe(180);
  });

  it('WhenZeroInterval_ThenReturnsInfinity', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(calculateNextInterrupt(0, 0)).toBe(Infinity);
  });

  it('WhenNegativeInterval_ThenReturnsInfinity', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(calculateNextInterrupt(-10, 0)).toBe(Infinity);
  });
});

describe('getTranscriptItemClass', () => {
  const base: Subtitle = {
    start: 0,
    end: 5,
    text: 'test',
    translation: 'test',
  };

  it('WhenCurrentTimeInRange_ThenReturnsActiveClass', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getTranscriptItemClass(2, base)).toBe(
      'border-amber-400/70 bg-white/10',
    );
  });

  it('WhenLearningClassification_ThenReturnsLearningClass', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(
      getTranscriptItemClass(10, { ...base, classification: 'LEARNING' }),
    ).toBe('border-amber-500/30');
  });

  it('WhenHardClassification_ThenReturnsHardClass', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(
      getTranscriptItemClass(10, { ...base, classification: 'HARD' }),
    ).toBe('border-red-500/30');
  });

  it('WhenNoClassification_ThenReturnsDefaultClass', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getTranscriptItemClass(10, base)).toBe('border-white/10');
  });

  it('WhenEasyClassification_ThenReturnsDefaultClass', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(
      getTranscriptItemClass(10, { ...base, classification: 'EASY' }),
    ).toBe('border-white/10');
  });

  it('WhenStartBoundary_ThenReturnsActiveClass', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getTranscriptItemClass(0, base)).toBe(
      'border-amber-400/70 bg-white/10',
    );
  });

  it('WhenEndBoundary_ThenReturnsNonActiveClass', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(getTranscriptItemClass(5, base)).toBe('border-white/10');
  });
});

describe('markWordKnown', () => {
  it('WhenLemmaMatches_ThenMarksKnown', { timeout: TEST_TIMEOUT_MS }, () => {
    const subtitles: Subtitle[] = [
      {
        start: 0,
        end: 5,
        text: 'Hola mundo',
        translation: 'Hello world',
        words: [
          { text: 'Hola', lemma: 'hola', difficulty: 'learning' },
          { text: 'mundo', lemma: 'mundo', difficulty: 'easy' },
        ],
      },
    ];
    const result = markWordKnown(subtitles, 'hola');
    expect(result[0].words?.[0].isKnown).toBe(true);
    expect(result[0].words?.[0].difficulty).toBe('easy');
    expect(result[0].words?.[1].isKnown).toBeUndefined();
  });

  it('WhenNoMatch_ThenNoChange', { timeout: TEST_TIMEOUT_MS }, () => {
    const subtitles: Subtitle[] = [
      {
        start: 0,
        end: 5,
        text: 'test',
        translation: 'test',
        words: [{ text: 'test', lemma: 'test', difficulty: 'hard' }],
      },
    ];
    const result = markWordKnown(subtitles, 'nonexistent');
    expect(result[0].words?.[0].difficulty).toBe('hard');
  });

  it('WhenMultipleSubtitles_ThenMarksAll', { timeout: TEST_TIMEOUT_MS }, () => {
    const subtitles: Subtitle[] = [
      {
        start: 0,
        end: 5,
        text: 'Hola',
        translation: 'Hello',
        words: [{ text: 'Hola', lemma: 'hola', difficulty: 'learning' }],
      },
      {
        start: 5,
        end: 10,
        text: 'Hola otra vez',
        translation: 'Hello again',
        words: [
          { text: 'Hola', lemma: 'hola', difficulty: 'learning' },
          { text: 'vez', lemma: 'vez', difficulty: 'easy' },
        ],
      },
    ];
    const result = markWordKnown(subtitles, 'hola');
    expect(result[0].words?.[0].isKnown).toBe(true);
    expect(result[1].words?.[0].isKnown).toBe(true);
    expect(result[1].words?.[1].isKnown).toBeUndefined();
  });
});

describe('shouldReportProgress', () => {
  it('WhenFiveSecondsElapsed_ThenReturnsTrue', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(shouldReportProgress(15, 100, 10)).toBe(true);
  });

  it('WhenLessThanFiveSeconds_ThenReturnsFalse', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(shouldReportProgress(13, 100, 10)).toBe(false);
  });

  it('WhenDurationZero_ThenReturnsFalse', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(shouldReportProgress(10, 0, 0)).toBe(false);
  });

  it('WhenDurationNegative_ThenReturnsFalse', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    expect(shouldReportProgress(10, -1, 0)).toBe(false);
  });

  it('WhenNaN_ThenReturnsFalse', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(shouldReportProgress(NaN, 100, 0)).toBe(false);
    expect(shouldReportProgress(10, NaN, 0)).toBe(false);
  });
});

describe('calcProgressPercent', () => {
  it('WhenHalfway_ThenReturns50', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(calcProgressPercent(50, 100)).toBe(50);
  });

  it('WhenDurationZero_ThenReturnsZero', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(calcProgressPercent(50, 0)).toBe(0);
  });

  it('WhenComplete_ThenReturns100', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(calcProgressPercent(100, 100)).toBe(100);
  });

  it('WhenOverflow_ThenClampsTo100', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(calcProgressPercent(150, 100)).toBe(100);
  });

  it('WhenNegativeTime_ThenClampsToZero', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(calcProgressPercent(-10, 100)).toBe(0);
  });

  it('WhenNaN_ThenReturnsZero', { timeout: TEST_TIMEOUT_MS }, () => {
    expect(calcProgressPercent(NaN, 100)).toBe(0);
    expect(calcProgressPercent(50, NaN)).toBe(0);
  });
});
