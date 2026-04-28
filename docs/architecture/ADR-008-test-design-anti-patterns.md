# ADR-008: Test Design Anti-Patterns and Event-Driven Determinism

**Status:** Accepted
**Date:** 2026-04-28
**Context:** A multi-day CI block traced to two compounding bugs: (a) `vi.mock('../infrastructure/database')` at the top of unit-test files pollutes module state for any singleton that captures `db` by reference at import time, and (b) `AppEventBus.emitAsync` invoked listeners via `Promise.all`, masking a real production race where progress-persistence and pipeline-orchestrator both subscribe to `video.processing.started`. Mocked-fast pipelines emitted `completed` before persistence had inserted the started row, leaving status stuck at `PROCESSING`. ADR-005 already mandates DI; this ADR codifies the failure modes and the concrete bans that follow from it.

## 1. Decision

The following patterns are **banned** in this repo. Pull requests that introduce them must be rejected.

### 1.1 No module-level mocks of shared infrastructure singletons

```ts
// BANNED
vi.mock('../infrastructure/database', () => ({ db: { ... } }));
import { progressPersistence } from './progress-persistence'; // captures mocked db at import
```

Reason: any module that does `import { db } from '../infrastructure/database'` and stores it in a singleton's closure (constructor, module-scope `const`) captures whatever `db` resolved to **at first import in the worker**. With `pool: 'threads'` or any module-cache reuse, that mocked reference leaks into the next test file — including integration tests that need the real DB.

**Required alternative:** Dependency Injection. Service classes accept `db` (and `eventBus`, etc.) as constructor parameters with production defaults. Unit tests instantiate the class directly with a fake.

```ts
// REQUIRED
export class ProgressPersistenceService {
  constructor(
    private readonly db: Db = defaultDb,
    eventBus: AppEventBus = defaultEventBus,
  ) { /* ... */ }
}

// In test:
new ProgressPersistenceService(mockDb, new AppEventBus());
```

### 1.2 No imports of production singletons in unit tests

```ts
// BANNED in unit tests
import { progressPersistence } from './progress-persistence';
import { orchestrator } from './pipeline-orchestrator';
```

Reason: importing the singleton triggers its constructor, which registers handlers on the **production** `eventBus`. Other tests in the same worker observe those listeners. Even with `isolate: true`, this couples test files to module-load order.

**Required alternative:** unit tests construct fresh instances on a fresh `AppEventBus`. Production singletons are only acceptable in:
- `*.integration.test.ts` (real wiring is the contract under test)
- `hooks.server.ts` and other startup files

### 1.3 No assumptions about parallel listener completion

`AppEventBus.emitAsync` runs listeners **sequentially in registration order**. Code that depends on Promise.all-style fan-out is rejected. If two handlers must both observe an event, the producer must not synthesize a downstream event until prior handlers complete — sequential `emitAsync` guarantees that.

If a handler is foundational (must run before peers — e.g., persistence inserting the row that downstream handlers will read), it must register with `prependListener`, not `on`. This makes ordering explicit and survives import-order shuffles.

```ts
// REQUIRED for handlers other listeners depend on
eventBus.prependListener('video.processing.started', this.handleStarted.bind(this));
```

### 1.4 No "isolation hacks" in test setup

```ts
// BANNED — these are smoke, not fix
beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});
```

If a test only passes with `resetModules` or `restoreAllMocks` in `beforeEach`, the test is exposing an underlying coupling bug. Fix the coupling (apply 1.1–1.3); do not paper over it.

## 2. Test Layering Rules

| Layer | Allowed | Banned |
|---|---|---|
| Unit (`*.test.ts`) | Direct class construction with fakes; isolated `AppEventBus` per test | Module-level `vi.mock` of `database`, `event-bus`, or any singleton; importing production singletons |
| Integration (`*.integration.test.ts`) | Importing production singletons; real DB; real `eventBus` | `vi.mock` of any infrastructure module |
| E2E (`tests/e2e/`) | Full app via Playwright | Any unit-style mocking |

## 3. Reviewer Checklist

When reviewing a new or modified test:

1. Does the test do `vi.mock('../infrastructure/database')` (or any infrastructure singleton)? → **Reject.** Refactor target service to DI.
2. Does the unit test import a production singleton (`orchestrator`, `progressPersistence`, etc.)? → **Reject.** Construct a fresh instance.
3. Does the test rely on `vi.resetModules()` or `vi.restoreAllMocks()` in `beforeEach` to pass? → **Reject.** Surface the real coupling.
4. Does the production code emit a follow-up event that another listener of the original event must observe first? → Require `prependListener` on the foundational listener.
5. Does the production code use `eventBus.emit` (fire-and-forget) where a follow-up handler must complete? → Require `await eventBus.emitAsync`.

## 4. Consequences

- **Positive:** test-file order independence, deterministic event-driven tests, no more "passes alone, fails in suite" debugging marathons. Production code is forced into DI shape, paying down architectural debt as a side effect.
- **Negative:** test setup is more verbose (each test wires its own graph). New service authors must learn the DI pattern up front rather than reaching for `vi.mock`.

## 5. References

- ADR-005: Dependency Injection Boundaries (this ADR is the enforcement layer)
- ADR-007: Idiomatic Backend Patterns (progress state model whose handlers race-prone here)
- `docs/standards/testing-and-di.md` (operational rules)
