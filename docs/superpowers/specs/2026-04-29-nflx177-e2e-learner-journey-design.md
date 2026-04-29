# NFLX-177: E2E Learner Journey — Design Spec

**Parent:** NFLX-177 — [STORY] E2E learner journey: register → profile → upload → transcribe → filter known → translate → watch

**Date:** 2026-04-29

## Problem

The Notflix platform has implementations for every step of the learner journey (register, profile, upload, transcribe, filter known words, translate, watch). However:

1. Two foundation tickets are in-progress (NFLX-28, NFLX-31) and blocking
2. A known test infrastructure issue (vi.mock leakage) causes flaky tests
3. The journey between steps has rough edges — missing loading states, error handling gaps, disconnected flows
4. No E2E test verifies the complete user journey works

## Approach

### Phase 1 — Unblock (parallel workers)

| Task | Ticket | Description |
|------|--------|-------------|
| Triage dev artifacts | NFLX-28 | Remove root-level dev artifacts, clean repo structure |
| Reconcile linters | NFLX-31 | Pick Biome or ESLint, remove the other, ensure consistent config |
| Fix vi.mock leakage | STUCK.md | Fix `progress-persistence.test.ts` module state leaking into `pipeline-orchestrator.integration.test.ts` |

### Phase 2 — Comprehensive Polish

For each journey step, apply: loading states, error handling, smooth transitions, edge cases.

**Register** (NFLX-69):
- Polish GoTrue + SSR cookie flow
- Error messages for duplicate email, weak password, network errors
- Redirect to profile setup after first registration

**Profile** (NFLX-70):
- Ensure nativeLang, targetLang, gameIntervalMinutes, CEFR persist
- Validation for required fields
- Profile completion gating (user must set languages before uploading)

**Upload** (NFLX-42, NFLX-43):
- Drag-drop edge cases: unsupported formats, oversized files, network interruption
- Progress polling reliability (reconnect on disconnect)
- Upload → studio list transition with real-time progress

**Transcribe / Pipeline** (NFLX-75):
- Failure handling: retry logic, error states in UI
- Progress stage visibility (user sees "Transcribing...", "Analyzing...", etc.)

**Filter Known** (NFLX-77):
- SpaCy filter integration with user's known_words
- Segment classification (EASY/LEARNING/HARD) surfaced correctly
- "Mark Known" action during playback persists to known_words table

**Translate** (NFLX-76):
- Translation delivery to subtitle display
- Fallback when translation unavailable
- Dual subtitle mode (target + native)

**Watch Player** (NFLX-48, NFLX-49, NFLX-50):
- VideoPlayer ↔ SubtitleDisplay integration
- Resume from watch_progress
- Per-word subtitle rendering with hover/focus tooltip
- Subtitle mode toggle (target / native / dual / off)

### Phase 3 — E2E Test (Playwright)

Full browser automation test covering the complete learner journey:

1. **Register** new user (GoTrue signup via Playwright bypass)
2. **Profile** setup (set nativeLang=en, targetLang=es, CEFR=A2)
3. **Upload** a test video file
4. **Wait** for processing pipeline to complete (poll progress)
5. **Watch** the processed video
6. **Verify** subtitles appear, words are interactive
7. **Mark** words as known during playback
8. **Verify** known words appear in /vocabulary page

Uses `PLAYWRIGHT_TEST=true` bypass for auth.

## Constraints

- SvelteKit + Svelte 5 (runes)
- Drizzle ORM + PostgreSQL
- Supabase GoTrue auth (self-hosted)
- Biome for linting (per AGENTS.md)
- Vitest + Playwright for testing
- pnpm monorepo

## Success Criteria

- All 7 journey steps flow seamlessly without dead-ends or crashes
- Loading states visible for all async operations
- Error states handled gracefully with user-facing messages
- Playwright E2E test passes reliably (no flakiness)
- NFLX-28, NFLX-31, and STUCK.md issues resolved
- vi.mock leakage fixed — all tests pass in full suite run
