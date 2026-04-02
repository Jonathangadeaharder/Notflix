# Learning Session State

**Status:** Active
**Purpose:** Define the shipped behavior for watch-progress persistence, resume behavior, comprehension indicators, and the in-player learning loop.

## 1. Watch Progress Persistence

- Watch progress is persisted only for authenticated users.
- Persistent state is stored in `watch_progress`, keyed by `(user_id, video_id)`.
- The player reports:
  - `currentTime`
  - `duration`
  - `progressPercent`
- The watch route persists progress periodically during playback and again on pause.
- Stored values are rounded to whole seconds, and `progressPercent` is rounded and clamped to `0..100`.

## 2. Resume Behavior

- When a saved `watch_progress` row exists, the watch route passes `videoProgress` into the player.
- The player seeks to that saved time after metadata loads.
- Resume applies to the canonical watch experience, not just a prototype route.

## 3. Continue Watching Semantics

- A video counts as **Continue Watching** when all of the following are true:
  - processing `status` is `COMPLETED`
  - saved `progressPercent` is greater than `0`
  - saved `progressPercent` is less than `100`
- The dashboard prioritizes a Continue Watching video as the featured/hero session when one exists.

## 4. Comprehension Percentage

Comprehension percentage is derived from processed segment classifications, not from raw playback position.

- `EASY` contributes `1.0`
- `LEARNING` contributes `0.7`
- `HARD` contributes `0.3`
- Missing classification defaults to the `LEARNING` weight

The displayed percentage is the rounded weighted average across all processed segments.

## 5. Smart Player Interactions

- Interactive subtitle words open a word-details tooltip on hover or keyboard focus.
- Opening a word tooltip pauses playback.
- Clicking a word pins the tooltip until the user closes it.
- **Mark Known** posts the lemma/lang pair to `/api/words/known` and updates the local subtitle state so the word immediately reflects its known status.
- The player exposes a transcript drawer backed by processed subtitle data from the watch route.

## 6. Game Overlay Behavior

- Intermissions are generated from the upcoming interval window, not the segment just watched.
- The interval window boundaries are computed by the pure function `getUpcomingGameWindow(startTime, intervalSeconds)` in `$lib/utils/game-window.ts`. It returns `{ start, end }` with a fixed look-ahead cap. The watch page calls this function; it is independently unit-testable with no player or DOM dependency.
- The flashcard overlay is keyboard-first:
  - `Space` or `Enter` flips the card
  - `ArrowLeft`, `1`, or `2` mark the card as unknown
  - `ArrowRight`, `3`, or `4` mark the card as known
- The overlay displays at most 5 visible cards at a time.
- Completing the card batch triggers a short resume transition before playback continues.
