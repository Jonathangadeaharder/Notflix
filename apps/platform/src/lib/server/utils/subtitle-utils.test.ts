import { describe, expect, it } from 'vitest';
import {
  generateSrt,
  generateVtt,
  parseSrt,
  secondsToSrtTime,
} from './subtitle-utils';

const TIMECODE_START_1 = '00:00:01,000';
const TIMECODE_END_1 = '00:00:05,000';
const TIMECODE_START_2 = '00:00:05,500';
const TIMECODE_END_2 = '00:00:10,000';
const EXPECTED_SEGMENT_COUNT = 2;
const FRACTIONAL_SECONDS = 61.5;
const SECONDS_IN_HOUR = 3600;

describe('parseSrt', () => {
  it('parses a valid SRT block into segments', () => {
    const srt = `1\n${TIMECODE_START_1} --> ${TIMECODE_END_1}\nHello world\n\n2\n${TIMECODE_START_2} --> ${TIMECODE_END_2}\nSecond segment`;

    const result = parseSrt(srt);
    expect(result).toHaveLength(EXPECTED_SEGMENT_COUNT);
    expect(result[0]).toEqual({
      index: 1,
      start: TIMECODE_START_1,
      end: TIMECODE_END_1,
      text: 'Hello world',
    });
  });

  it('returns empty array for empty input', () => {
    expect(parseSrt('')).toEqual([]);
  });

  it('handles multi-line subtitle text', () => {
    const srt = `1\n00:00:00,000 --> 00:00:03,000\nLine one\nLine two`;
    const result = parseSrt(srt);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Line one\nLine two');
  });

  it('skips blocks with fewer than 3 lines', () => {
    expect(parseSrt('1\nJust a lonely line')).toEqual([]);
  });

  it('skips blocks with malformed timecodes', () => {
    expect(parseSrt('1\nNOT_A_TIMECODE\nSome text here')).toEqual([]);
  });
});

describe('generateSrt', () => {
  it('generates a valid SRT string from segments', () => {
    const segments = [
      { index: 1, start: TIMECODE_START_1, end: TIMECODE_END_1, text: 'Hello' },
      { index: 2, start: '00:00:06,000', end: TIMECODE_END_2, text: 'World' },
    ];
    const result = generateSrt(segments);
    expect(result).toContain(
      `1\n${TIMECODE_START_1} --> ${TIMECODE_END_1}\nHello`,
    );
  });
});

describe('generateVtt', () => {
  it('generates valid WebVTT with header', () => {
    const segments = [
      {
        index: 1,
        start: TIMECODE_START_1,
        end: TIMECODE_END_1,
        text: 'Sub One',
      },
    ];
    const result = generateVtt(segments);
    expect(result).toMatch(/^WEBVTT/);
    expect(result).toContain('Sub One');
  });

  it('replaces commas with dots in timecodes', () => {
    const segments = [
      { index: 1, start: '01:02:03,456', end: '01:02:04,789', text: 'Test' },
    ];
    const result = generateVtt(segments);
    expect(result).toContain('01:02:03.456');
    expect(result).not.toContain(',');
  });
});

describe('secondsToSrtTime', () => {
  it('converts 0 seconds', () => {
    expect(secondsToSrtTime(0)).toBe('00:00:00,000');
  });

  it('converts fractional seconds correctly', () => {
    const result = secondsToSrtTime(FRACTIONAL_SECONDS);
    expect(result).toContain('01:01');
    expect(result).toContain(',500');
  });

  it('converts a full hour correctly', () => {
    const result = secondsToSrtTime(SECONDS_IN_HOUR);
    expect(result).toMatch(/^01:/);
  });
});
