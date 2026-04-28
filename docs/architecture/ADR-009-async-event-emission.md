# ADR-009: Async Event Emission for Listener Ordering

**Status:** Accepted  
**Date:** 2026-04-28  
**Deciders:** Jonathan  
**Relates to:** ADR-005 (DI & Testing), ADR-008 (Test Design Anti-Patterns)

---

## Context

After completing the DI refactor (ADR-008), integration tests for `pipeline-orchestrator` were flaky: ~50% of runs left `videoProcessing.status` stuck at `PROCESSING` instead of `COMPLETED`.

### Root cause

`AppEventBus.emitAsync` originally used `Promise.all` to fan out to listeners:

```ts
// BEFORE (event-bus.ts)
await Promise.all(listeners.map((listener) => listener(payload)));
```

This meant all listeners ran **concurrently**. The event chain was:

1. `video.processing.started` → `handleStarted` (persistence) inserts QUEUED row
2. `video.processing.started` → `handleVideoProcessingStarted` (orchestrator) runs full pipeline
3. Pipeline emits progress events via sync `eventBus.emit('progress', ...)` — fire-and-forget
4. Pipeline emits `video.processing.completed`

The problem: step 3 used **sync** `emit`, which kicked off `handleProgress` DB writes as unawaited promises. The pipeline then immediately emitted `completed`, which ran `handleCompleted` — but the progress write from step 3 hadn't landed yet. In integration tests (mocked AI, no real I/O), the pipeline was so fast that:

- `handleCompleted` ran and set status = COMPLETED
- Then `handleProgress`'s DB write landed and overwrote status back to PROCESSING

This was invisible in production because real I/O latency kept the writes ordered, but it was a latent race condition masked by timing.

### Why ADR-008's prependListener fix wasn't enough

ADR-008 fixed the **cross-listener** ordering (persistence before orchestrator) by using `prependListener`. But the **intra-pipeline** race remained: the orchestrator's own progress emits were fire-and-forget, so they could land after the completion emit.

## Decision

1. **`emitAsync` runs listeners sequentially, in registration order** (not `Promise.all`). This ensures persistence handlers finish before downstream pipeline handlers emit follow-up events.

2. **All event emissions that trigger DB writes must be `await`ed.** Specifically, `emitProgress` in `PipelineOrchestrator` is now `async` and uses `emitAsync` instead of sync `emit`. Every call site awaits it.

3. **Handlers that other handlers depend on must register with `prependListener`.** Persistence (which writes status rows) registers via `prependListener` so it runs before the orchestrator (which emits follow-up events).

### Code changes

```ts
// BEFORE — fire-and-forget, races with completion
private emitProgress(videoId, targetLang, stage, percent) {
  this.eventBus.emit('video.processing.progress', { videoId, targetLang, stage, percent });
}

// AFTER — awaited, guarantees DB write lands before pipeline continues
private async emitProgress(videoId, targetLang, stage, percent) {
  await this.eventBus.emitAsync('video.processing.progress', { videoId, targetLang, stage, percent });
}
```

All call sites changed from `this.emitProgress(...)` to `await this.emitProgress(...)`.

## Consequences

### Positive

- Integration tests are deterministic — no more flakes from write-ordering races
- The same race existed in production (masked by I/O latency); now eliminated
- `emitAsync` sequential semantics are easier to reason about than `Promise.all` fan-out
- `prependListener` makes handler ordering explicit rather than import-order-dependent

### Negative

- Sequential listener execution is slower than parallel for independent listeners. Acceptable: our listeners are few and fast; the correctness gain outweighs the micro-benchmark difference.
- Developers must remember to `await` any `emitAsync` call that triggers downstream side effects. Lint rule candidate for future.

## Enforcement

- ADR-008's linter rules (VITEST-DEP-001/002/003) catch the module-level mock anti-patterns that originally triggered this investigation
- `emitAsync` sequential semantics are enforced in `event-bus.ts` — no way to accidentally use `Promise.all` again
- Integration test (`pipeline-orchestrator.integration.test.ts`) verifies the full event chain with real DB writes
