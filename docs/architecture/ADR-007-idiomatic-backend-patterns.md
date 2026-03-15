# ADR-007: Idiomatic Backend Patterns (Tasks, Errors, and Progress State)

**Status:** Accepted
**Date:** 2025-12-20
**Context:** The platform needs consistent backend patterns for orchestration, dependency wiring, and progress reporting across the SvelteKit host and the FastAPI AI service.

## 1. Decision

We adopt the following backend patterns:

- **Background tasks:** fire-and-forget work is tracked through a centralized `TaskRegistry`
- **Dependency injection:** the host uses a shared container; the AI service uses FastAPI `Depends(...)`
- **Progress state:** long-running processing persists coarse lifecycle plus UI-facing progress in `video_processing`
- **Request context:** request IDs flow through AsyncLocalStorage on the host and `X-Request-ID` across service calls
- **Startup cleanup:** stale in-flight rows are repaired on boot through the shared orchestrator instance

## 2. Processing State Model

`video_processing` is the canonical backend state for media processing.

- **`status`** is the coarse lifecycle:
  - `PENDING`
  - `COMPLETED`
  - `ERROR`
- **`progress_stage`** is the user-facing stage:
  - `QUEUED`
  - `THUMBNAIL_GENERATION`
  - `TRANSCRIBING`
  - `ANALYZING`
  - `TRANSLATING`
  - `READY`
  - `FAILED`
- **`progress_percent`** is the integer `0..100` progress indicator surfaced to the UI

### Transition Rules

- Lock acquisition or retry starts at `PENDING / QUEUED / 0`
- Active processing keeps `status = PENDING` while only stage/percent change
- Successful completion writes `COMPLETED / READY / 100`
- Runtime failure writes `ERROR / FAILED / 0`
- Startup stale-task cleanup writes the same `ERROR / FAILED / 0` terminal state for zombie rows

The frontend consumes this state via polling; there is no SSE/WebSocket client contract for processing updates.

## 3. Dependency Wiring

### Host (SvelteKit)

- Shared instances are composed in `src/lib/server/container.ts`
- Routes and startup hooks should use container exports rather than instantiating fresh service graphs

### Brain (FastAPI)

- Route handlers obtain heavy services through `Depends(...)`
- Lifespan bootstrapping provides the production instances behind those dependency functions

## 4. Background Work and Locking

`Orchestrator.acquireProcessingLock()` prevents duplicate processing of the same `(video_id, target_lang)` pair.

- Existing `PENDING` row: refuse duplicate work
- Existing terminal row: allow retry by resetting the row
- Missing row: create a new processing record

This protects against duplicate "Process" actions and unnecessary GPU/CPU cost.

## 5. Request Context

`request-context.ts` uses `AsyncLocalStorage` so a request ID can flow through host-side code without being threaded through every function signature. The real AI gateway forwards that request ID to the AI service through `X-Request-ID`.

## 6. Startup Cleanup

`hooks.server.ts` invokes `orchestrator.cleanupStaleTasks()` through the shared container instance during server startup.

- The call happens once per boot.
- Its purpose is repair, not reprocessing.
- Any rows left in `PENDING` from a prior crash are converted into the canonical failure state so Studio, dashboard, and upload UI do not display phantom in-flight work.

## 7. Consequences

- **Positive:** duplicate processing is constrained, progress is queryable from persisted state, and backend wiring remains testable and explicit
- **Negative:** correctness depends on keeping the shared container, progress writes, and cleanup behavior aligned with the same lifecycle model
