import { describe, expect, it } from 'vitest';
import { getUpcomingGameWindow } from './game-window';

const MINUTES_PER_WINDOW = 10;
const SECONDS_IN_MINUTE = 60;
const NEXT_WINDOW_MULTIPLIER = 2;
const TEN_MINUTES_IN_SECONDS = MINUTES_PER_WINDOW * SECONDS_IN_MINUTE;
const NEXT_INTERVAL_END = TEN_MINUTES_IN_SECONDS * NEXT_WINDOW_MULTIPLIER;

describe('getUpcomingGameWindow', () => {
  it('returns the next unseen interval after an interruption point', () => {
    expect(
      getUpcomingGameWindow(TEN_MINUTES_IN_SECONDS, TEN_MINUTES_IN_SECONDS),
    ).toEqual({
      start: TEN_MINUTES_IN_SECONDS,
      end: NEXT_INTERVAL_END,
    });
  });
});
