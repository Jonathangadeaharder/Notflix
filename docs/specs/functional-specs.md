# System Specifications: "Notflix" Language Platform

**Version:** 1.2 (Revised 2026-03-14)
**Architecture:** KISS (Keep It Simple, Stupid) - SvelteKit + FastAPI + Postgres

This document is normative for shipped runtime product behavior. Persistent data shape lives in `docs/specs/database-schema.md`. Processing and learning-session state are further defined in `docs/specs/processing-progress.md` and `docs/specs/learning-session-state.md`.

## 1. Core Concept

Notflix is a video-first language learning product. It does not translate everything indiscriminately; it uses processed subtitle data, known-word state, and timed intermissions to focus the learner on the words they are most ready to acquire.

## 2. Data Model Overview

Persistent storage is defined in `packages/database/schema.ts`.

- **User/profile:** native language, target language, and game interval preferences
- **Known words:** lemma-level vocabulary state per user and language
- **Video processing:** processed subtitle JSON plus coarse and fine-grained progress state
- **Watch progress:** per-user resume state for completed videos
- **Video lemmas:** per-video lemma counts for dashboard and future analytics

## 3. Processing Pipeline

The SvelteKit orchestrator coordinates the AI service over blocking JSON requests.

### 3.1 Transcription

- Input: a shared-media file path
- Action: call Brain `/transcribe`
- Result: timestamped transcript segments

### 3.2 Linguistic Analysis

- Action: call Brain `/filter` in batch
- Result: tokenized segments with lemma, POS, stop-word, and whitespace data

### 3.3 User-Aware Filtering

- Compare segment lemmas against the user's known-word state
- Classify segments into `EASY`, `LEARNING`, or `HARD`
- Thresholds remain defined in code constants

### 3.4 Translation

- **Authenticated users:** translate unknown lemmas from `LEARNING` segments only
- **Guests:** translate only the first 50 unique lemmas to cap cost
- **All users:** still receive full-sentence translations for translated-subtitle modes

### 3.5 Persistence

- Save enriched subtitle JSON to `video_processing.vtt_json`
- Refresh `video_lemmas` from the saved subtitle data
- Persist progress lifecycle in `video_processing.status`, `progress_stage`, and `progress_percent`

## 4. Communication, Pathing, and Status

### 4.1 Internal API

Platform-to-AI communication uses standard blocking JSON POST requests on the private Docker network. No NDJSON or streaming protocol is used.

### 4.2 Media Path Contract

- Media is stored on the shared filesystem under `media/`
- The platform sends media-root-relative POSIX paths to the AI service when possible
- The AI service resolves incoming paths against the configured media root before filesystem access

### 4.3 Progress Tracking

- The UI does not use SSE or WebSockets for processing state
- Studio invalidates the videos query every 3 seconds while any visible row is still `PENDING`
- The upload page polls `GET /api/videos/[id]/progress` every 3 seconds until terminal state
- Detailed lifecycle semantics live in `docs/specs/processing-progress.md`

## 5. Dashboard Behavior

The home route is a data-backed dashboard, not a marketing landing page.

- The featured session prefers a **Continue Watching** video when one exists
- Otherwise, the dashboard falls back to the first completed video, then the most recent video
- Each card surfaces:
  - processing state
  - watch-progress state
  - comprehension percentage
- Continue Watching and comprehension semantics are defined in `docs/specs/learning-session-state.md`

## 6. Smart Player Behavior

The canonical watch route uses the shared `VideoPlayer` experience.

- Resume starts from persisted watch progress when available
- Subtitle words are interactive:
  - hover or keyboard focus reveals word details and pauses playback
  - click pins the tooltip
  - **Mark Known** persists the lemma and updates the local subtitle state immediately
- A transcript drawer is available from the processed subtitle data
- A subtitle heatmap visualizes segment difficulty across the media timeline

## 7. Studio Upload Behavior

- The upload screen supports drag-and-drop and direct file selection
- The upload form captures both the **video language** (`targetLang`) and the **user's native language** (`nativeLang`); both are passed to the processing pipeline
- Successful upload redirects to Studio; processing begins immediately in the background
- The Studio list shows an inline progress bar for every `PENDING` video, surfacing `progressStage`, `progressPercent`, and the pipeline step strip from `PIPELINE_STEPS` / `getUploadStepState` (`$lib/upload-pipeline`)
- Studio polls `invalidate('app:videos')` every 3 seconds while any visible video is `PENDING`

## 8. Game & Watch Loop

The player integrates spaced repetition into playback.

1. The user-configured interval determines the next interruption point.
2. When the interval is reached, playback pauses.
3. Flashcards are generated from the **upcoming** interval window, not the segment just watched.
4. The overlay is keyboard-first and displays a bounded set of visible cards.
5. Completing the batch resumes playback smoothly.

Deck-generation and overlay-state semantics are further defined in `docs/specs/learning-session-state.md`.

## 9. Vocabulary Management

- The main navigation includes a **Vocabulary** link (`/vocabulary`) accessible from all authenticated pages
- The vocabulary section surfaces the user's known-word state per language
- Known-word state is persisted in `known_words`, keyed by `(user_id, lemma, lang)`
- Words can be marked known from the watch player (see §6) or managed directly in the vocabulary view

## 10. Non-Goals

The following remain intentionally out of scope to preserve the local-first KISS model:

### 10.1 Infrastructure & Real-Time

- Rate limiting for public multi-tenant traffic
- WebSocket/SSE client progress streaming
- Distributed queue infrastructure

### 10.2 Media & Playback

- Real-time transcoding
- DRM support
- 10-foot TV remote interface design

### 10.3 AI & Language Scope

- Pronunciation scoring
- Live-stream processing
- OCR/on-screen text extraction

### 10.4 External Integrations

- Metadata scraping from TMDB/IMDB
- Bi-directional Anki sync
