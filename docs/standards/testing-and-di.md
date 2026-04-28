# Testing and DI Standard

**Status:** Active
**Purpose:** Record the current testing and dependency-injection conventions that support the architectural decisions in `ADR-005` and `ADR-007`.

## 1. Platform Conventions

- Construct application services behind ports/adapters and compose them in `src/lib/server/container.ts`.
- Startup and route code should consume shared container instances rather than instantiating fresh services ad hoc.
- Unit tests should replace dependencies through constructor injection, fake adapters, or mocked container seams.

## 2. AI Service Conventions

- FastAPI route handlers obtain heavy services through `Depends(...)`.
- Tests must replace FastAPI dependencies through `app.dependency_overrides`.
- Tests must not mutate global `brain_state` directly to fake model behavior; overrides are the canonical seam.

## 3. Test Layering

- Unit tests should avoid loading real AI models.
- Integration or manual tests may exercise real models explicitly when validating model-backed behavior.
- Prefer gold fixtures, fake gateways, or mocked adapter responses for fast feedback on orchestration and UI flows.

## 4. Banned Test Patterns (see ADR-008)

The following patterns are **rejected on review**:

1. `vi.mock('../infrastructure/database')` — or any module-level mock of an infrastructure singleton (db, eventBus, container). Use constructor DI with a fake instead.
2. Importing production singletons (`orchestrator`, `progressPersistence`, etc.) inside unit tests. Construct a fresh instance with a fresh `AppEventBus` per test.
3. `beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); })` as a fix for cross-file flakiness. Surface the real coupling.
4. Assuming `emitAsync` runs listeners in parallel. It is sequential, in registration order. Handlers other listeners depend on must register with `prependListener`.
5. Sync `eventBus.emit(...)` for events that trigger DB writes. Use `await eventBus.emitAsync(...)` — fire-and-forget emits race with completion handlers. See ADR-009.

See ADR-008 for the reviewer checklist and rationale. See ADR-009 for the async emission race condition.

## 5. Scope

This document is normative for testing workflow and DI usage. Architectural motivation stays in the ADRs; everyday testing rules live here.
