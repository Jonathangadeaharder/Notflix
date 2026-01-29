# System Specifications: "Notflix" Language Platform

**Version:** 1.1 (Revised 2025-12-19)
**Architecture:** KISS (Keep It Simple, Stupid) - SvelteKit + FastAPI + Postgres.

## 1. Core Concept

A "Netflix-style" video player that acts as a language engine. Instead of translating everything, it calculates the user's "knowledge gap" for a specific episode and translates **only** the words they do not know, turning entertainment into a targeted spaced-repetition loop.

## 2. Data Models (Schema)

Defined in `packages/db/schema.ts` using Drizzle.

### 2.1 User & Profile

Tracks native/target languages and learning preferences (e.g., game frequency).

### 2.2 Vocabulary Knowledge Base

Tracks knowledge at the **Lemma** level (e.g., knowing "run" means you know "running"). This is the source of truth for the "Gap Analysis".

### 2.3 Video & Processing

Tracks media metadata and the resulting structured linguistic data (`vttJson`).

---

## 3. The "Smart Filter" Logic (Pipeline)

Executed by the **Orchestrator (SvelteKit)**, coordinating AI services via REST/JSON.

### Phase 1: Transcription (Whisper)

- **Input:** Video File Path (Shared Volume).
- **Action:** Call Brain `/transcribe`.
- **Result:** Timestamped segments with raw text.

### Phase 2: Analysis (SpaCy)

- **Action:** Call Brain `/filter` (Batch).
- **Linguistic Data:** Each segment is tokenized with Lemmas, POS tags, and Stop-word status.

### Phase 3: Filtering (Gap Analysis)

- **Context:** User-aware filtering.
- **Rule:** Compare segment lemmas against the **Known Words** database.
- **Classification:**
  - **EASY:** 100% words known.
  - **LEARNING:** High ratio of known words, but contains target "unknowns".
  - **HARD:** Too many unknown words for effective learning.

### Phase 4: Just-in-Time Translation (MarianMT)

- **Action:** Call Brain `/translate` for unknown lemmas found in "Learning" segments.
- **Storage:** Save full JSON structure (Segments + Tokens + Translations) to Postgres.

---

## 4. Communication & Status

### 4.1 Internal API

Communication between SvelteKit and Python happens over a private Docker network using **Standard JSON POST** requests. No streaming or NDJSON is used.

### 4.2 Status Tracking (Polling)

- The UI does not use SSE or WebSockets.
- **Idiomatic Refresh:** The UI uses SvelteKit's granular `invalidate('app:videos')` every 3 seconds while any visible video has a `PENDING` status. This re-runs the specific database query for the video list without refreshing the entire page or layout state.

## 5. Media Management

- **Storage:** Shared filesystem volume (`media/uploads`).
- **Thumbnail Generation:** Triggered during the pipeline via Brain `/generate_thumbnail` (FFmpeg wrapper).

---

## 6. The "Game & Watch" Loop

Directly integrates Spaced Repetition into the video player.

1.  **Interval:** User sets a frequency (e.g., every 10 minutes).
2.  **Trigger:** Video reaches the interval.
3.  **Action:** Video pauses; Flashcard Overlay appears using unknown words from the _upcoming_ 10-minute segment.
4.  **Resume:** Video resumes once the user completes the "Knowledge Check".

---

## 7. Non-Goals (Explicitly Out of Scope)

The following features are intentionally **NOT** implemented:

## 7. Non-Goals (Explicitly Out of Scope)

The following features are intentionally **NOT** implemented to maintain the "KISS" and "Local-First" philosophy:

### 7.1 Infrastructure & Real-time

- **Rate Limiting:** Not needed for a local-first, single-machine deployment.
- **WebSocket/SSE:** Polling (3s interval) is sufficient and simpler.
- **Distributed Queues:** `TaskRegistry` with Promises handles background work adequately.

### 7.2 Media & Playback

- **Real-time Transcoding:** No Plex-style on-the-fly transcoding. Users must provide browser-compatible files (MP4/WebM).
- **DRM Support:** No support for encrypted content (Widevine/FairPlay).
- **TV Interface:** UI is designed for Laptop/Tablet (mouse/touch), not 10-foot TV remotes.

### 7.3 AI & Language Scope

- **Pronunciation Scoring:** This is a listening/comprehension tool. No microphone integration.
- **Live Streams:** Pipeline is designed for batch processing of complete files, not RTMP/HLS streams.
- **OCR:** We process audio/subtitles, not on-screen text.

### 7.4 Integrations

- **Metadata Scraping:** No TMDB/IMDB integration. Rely on filenames.
- **Bi-directional Anki Sync:** Export only. State synchronization is too complex.
