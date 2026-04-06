# Processing Progress Semantics

**Status:** Active
**Purpose:** Define the canonical meaning of `video_processing.status`, `progress_stage`, `progress_percent`, and the polling behavior that surfaces them in the product.

## 1. Persistent Model

Processing progress is persisted in `video_processing`, keyed by the composite primary key `(video_id, target_lang)`.

- **`status`** is the coarse lifecycle field:
  - `PENDING`
  - `COMPLETED`
  - `ERROR`
- **`progress_stage`** is the finer-grained UI-facing stage field:
  - `QUEUED`
  - `THUMBNAIL_GENERATION`
  - `TRANSCRIBING`
  - `ANALYZING`
  - `TRANSLATING`
  - `READY`
  - `FAILED`
- **`progress_percent`** is an integer progress indicator in the inclusive range `0..100`.

## 2. Transition Rules

- When processing is first acquired, or when a retry replaces a previous terminal row, the canonical starting state is:
  - `status = PENDING`
  - `progress_stage = QUEUED`
  - `progress_percent = 0`
- While orchestration is actively running, `status` remains `PENDING`; only `progress_stage` and `progress_percent` advance.
- Successful completion writes:
  - `status = COMPLETED`
  - `progress_stage = READY`
  - `progress_percent = 100`
- Runtime failures write:
  - `status = ERROR`
  - `progress_stage = FAILED`
  - `progress_percent = 0`
- Startup stale-task cleanup applies the same terminal failure shape to any rows left in `PENDING` from a prior crash.

## 3. UI-Local Stages

The upload page may show additional local-only states before a persisted `video_processing` row exists:

- `IDLE`
- `UPLOADING`
- `STARTING`

These are presentation states only. They are not stored in `video_processing` and must not be treated as database enum values.

## 4. UI Rendering Module

Progress rendering in Studio is handled by two pure-TS exports from `$lib/upload-pipeline`:

- **`PIPELINE_STEPS`**: ordered array of `{ key, label }` objects representing each processing stage
- **`getUploadStepState(stepKey, currentStage, status, isSubmitting)`**: maps a step key against current `progressStage` and `status` to one of `'complete' | 'active' | 'error' | 'pending'`

The Studio card renders a `progressPercent` bar and a per-step color strip using these exports. Because both are pure functions with no side effects, they are independently unit-testable without any DB or network dependency.

## 5. Polling Contract

- The platform does not use SSE or WebSockets for processing progress.
- The Studio list uses SvelteKit `invalidate('app:videos')` every 3 seconds while any visible video is still `PENDING`.
- The upload page polls `GET /api/videos/[id]/progress` every 3 seconds until the row reaches `COMPLETED` or `ERROR`.
- The dashboard reads the latest persisted progress during page load; it does not maintain a live subscription.

## 6. API Contract

`GET /api/videos/[id]/progress` returns:

- `status`
- `progressStage`
- `progressPercent`
- `watchProgress` for the authenticated user, if present

The route currently reads processing state for `CONFIG.DEFAULT_TARGET_LANG`; callers should treat that as the current platform default behavior.
