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

## 4. Scope

This document is normative for testing workflow and DI usage. Architectural motivation stays in the ADRs; everyday testing rules live here.
