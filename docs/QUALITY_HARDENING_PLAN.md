# Production Quality Hardening Plan

Status: Active
Owner: Engineering
Last updated: 2026-02-07

## Goal

Prevent production-only defects by enforcing:

- strict module responsibility boundaries
- mandatory unit, integration, and end-to-end checks
- fail-fast CI quality gates for every change

## Enforced Baseline (Implemented)

1. `apps/platform` test execution is now explicit and mandatory:
   - `npm run test:unit --workspace=@notflix/platform`
   - `npm run test:integration --workspace=@notflix/platform`
2. Vitest now includes API tests under `apps/platform/tests/api`.
3. Platform unit tests now enforce baseline coverage thresholds:
   - statements: 40%
   - lines: 40%
   - functions: 40%
   - branches: 35%
4. CI workflow `.github/workflows/quality-gates.yml` now blocks merges when:
   - platform type-check fails
   - platform lint fails
   - platform unit/integration tests fail
   - AI service tests fail
5. Upload flow has been refactored from route-level orchestration into dedicated service module:
   - `apps/platform/src/lib/server/services/upload-video.service.ts`

## Gap Closure Roadmap

### Phase 1: Test Reliability (0-2 weeks)

1. Stabilize integration runtime in CI and local dev:
   - single documented DB bootstrap path
   - deterministic env for integration tests
2. Remove any skipped integration tests unless explicitly quarantined.
3. Add PR template requirement for test evidence.

### Phase 2: Responsibility Refactors (1-4 weeks)

1. Refactor high-risk route handlers into service modules:
   - `routes/api/process/[id]`
   - `routes/api/videos/[id]`
   - `routes/api/videos/[id]/subtitles`
2. Require one unit test per new service and one API behavior test per route.
3. Add architecture checks for route -> service -> infrastructure dependency direction.

### Phase 3: Coverage Ratchet (ongoing)

1. Raise coverage thresholds every sprint by +5% until reaching:
   - statements/lines/functions: 70%
   - branches: 60%
2. For modified files in critical paths (`src/lib/server/**`, `src/routes/api/**`), require no coverage drop.

### Phase 4: Production Feedback Loop (ongoing)

1. Every production incident must produce:
   - one failing test that reproduces the issue
   - one permanent guard test merged in the fix PR
2. Track incidents by category:
   - missing unit test
   - missing integration test
   - missing e2e path
   - architecture boundary violation

## Definition of Done for New Features

1. Business logic placed in a dedicated service module.
2. Route handler limited to transport concerns (request parsing, auth, response mapping).
3. Unit tests for new service behavior.
4. Integration test for DB-backed behavior when persistence is involved.
5. E2E test for the user-visible path if it changes.
6. CI green across all quality gates.
