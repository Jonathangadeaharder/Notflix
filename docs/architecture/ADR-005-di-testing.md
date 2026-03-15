# ADR-005: Dependency Injection Boundaries

**Status:** Approved
**Date:** 2025-12-09
**Context:** The platform must remain testable and fast without coupling application logic to concrete infrastructure or forcing heavy AI model loading into unit tests.

## 1. Decision

We use explicit dependency-injection seams on both sides of the system:

- **Platform (SvelteKit):** constructor-based injection with shared singleton wiring in `src/lib/server/container.ts`
- **AI Service (FastAPI):** route-level dependency injection through `Depends(...)`
- **Tests:** replace dependencies at the seam rather than mutating global runtime state

Detailed testing workflow lives in `docs/standards/testing-and-di.md`. This ADR is limited to the architectural boundaries that make that workflow possible.

## 2. Platform Boundary

Application services depend on ports/interfaces rather than concrete adapters.

- Real adapters are used in production.
- Mock or fake adapters are used in unit tests.
- Startup and route code should consume the shared container instead of constructing fresh service graphs ad hoc.

This keeps orchestration, subtitle processing, and other domain services testable without changing the calling code.

## 3. AI Service Boundary

FastAPI route handlers obtain heavy services through dependency functions.

- `get_transcriber()`
- `get_filter()`
- `get_translator()`

These dependencies are backed by lifespan-managed runtime state in production, but the route contract is the dependency function, not the global variable.

## 4. Testing Implication

FastAPI tests must override dependencies through `app.dependency_overrides`.

- This is the canonical test seam for Python routes.
- Tests must not mutate `brain_state` directly to fake model behavior.
- The goal is to test route behavior against a stable dependency contract instead of reaching into runtime internals.

## 5. Consequences

- **Positive:** clear seams for mocks/fakes, fast unit tests, and less accidental coupling to model bootstrapping details
- **Negative:** requires discipline to keep startup wiring, route dependencies, and tests aligned with the same injection boundaries
