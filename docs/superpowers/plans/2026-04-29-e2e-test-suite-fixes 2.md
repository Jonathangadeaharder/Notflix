# E2E Test Suite Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all E2E test failures so the full Playwright suite passes in batch mode (21/21 pass).

**Architecture:** Three independent blockers, then a verification pass. Blockers can run in parallel: (A) E2E hook in watch page, (B) test isolation, (C) VocabularyPage placeholder fix. After blockers land, run the full suite and fix any remaining issues.

**Tech Stack:** SvelteKit + Svelte 5 (runes), Playwright, TypeScript, Vitest

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/routes/watch/[id]/+page.svelte` | Modify | Add `window.__e2eTriggerGameInterrupt` hook |
| `src/lib/e2e-hooks.ts` | Create | Shared E2E hook registration helpers |
| `tests/pages/VocabularyPage.ts` | Modify | Fix search input placeholder selector |
| `tests/e2e/learner-journey.spec.ts` | Modify | Remove redundant route mocks, rely on seed + hook |
| `tests/e2e/learner-watch.spec.ts` | Modify | Remove redundant route mocks, rely on seed + hook |
| `tests/e2e/vocabulary-browse.spec.ts` | Modify | Add afterAll cleanup for known-word toggle state |
| `tests/e2e/profile-settings.spec.ts` | Modify | Add afterAll cleanup for game interval |
| `tests/e2e/creator-upload.spec.ts` | Modify | Add afterAll cleanup for uploaded video |
| `apps/platform/playwright.config.ts` | Modify | Add `fullyParallel: false` + serial mode guarantee |

---

## Task A: Implement E2E Game Interrupt Hook

**Why:** `learner-journey.spec.ts` and `learner-watch.spec.ts` both timeout waiting for `window.__e2eTriggerGameInterrupt` — it was never implemented. The hook must bypass the normal time-based interrupt and inject `GameCard[]` directly into the watch page's `gameCards` state.

**Files:**
- Create: `src/lib/e2e-hooks.ts`
- Modify: `src/routes/watch/[id]/+page.svelte`

### Step A1: Create E2E hook module

- [ ] Create `apps/platform/src/lib/e2e-hooks.ts`:

```typescript
import type { GameCard } from "$lib/types";

export type E2ETriggerGameInterrupt = (cards: GameCard[]) => void;
```

### Step A2: Register hook in watch page onMount

- [ ] In `src/routes/watch/[id]/+page.svelte`, add `onMount` import and hook registration:

Add to the `<script lang="ts">` imports:
```typescript
import { onMount } from "svelte";
import type { E2ETriggerGameInterrupt } from "$lib/e2e-hooks";
```

Add after the `handleProgressUpdate` function (around line 92):
```typescript
onMount(() => {
  if (typeof window !== "undefined" && import.meta.env.MODE !== "production") {
    (window as any).__e2eTriggerGameInterrupt = ((cards: GameCard[]) => {
      gameCards = cards;
    }) satisfies E2ETriggerGameInterrupt;
  }
  return () => {
    if (typeof window !== "undefined") {
      delete (window as any).__e2eTriggerGameInterrupt;
    }
  };
});
```

### Step A3: Verify watch page still builds

- [ ] Run: `cd apps/platform && pnpm exec svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3`
Expected: 0 errors, 0 warnings

### Step A4: Commit

```bash
git add apps/platform/src/lib/e2e-hooks.ts apps/platform/src/routes/watch/[id]/+page.svelte
git commit -m "feat: expose __e2eTriggerGameInterrupt hook for Playwright tests"
```

---

## Task B: Fix Test Isolation (State Leakage Between Test Files)

**Why:** Tests pass individually but fail in batch. Root causes: (1) `creator-upload` adds a video that changes studio-browse expectations, (2) `profile-settings` mutates game interval without reliable cleanup, (3) `vocabulary-browse` toggles "hola" known state without cleanup. Fix: add `afterAll` cleanup to each state-mutating test.

**Files:**
- Modify: `tests/e2e/creator-upload.spec.ts`
- Modify: `tests/e2e/profile-settings.spec.ts`
- Modify: `tests/e2e/vocabulary-browse.spec.ts`

### Step B1: Fix creator-upload cleanup

- [ ] In `tests/e2e/creator-upload.spec.ts`, add an `afterAll` that deletes any video created during the test (identified by title containing the test's dynamic email or a marker). Read the current file first to understand the exact title used, then add cleanup.

Pattern: After the test completes, use the `request` fixture to DELETE the created video, or add a DB cleanup in `afterAll` using the same postgres connection pattern from `seed.ts`.

### Step B2: Fix profile-settings cleanup

- [ ] In `tests/e2e/profile-settings.spec.ts`, the `finally` block in test 2 tries to restore the original interval. Verify this works correctly. If the test fails before the restore, the interval stays wrong. Wrap the entire test in try/finally that's more robust, or add an `afterAll` that resets via API call.

### Step B3: Fix vocabulary-browse cleanup

- [ ] In `tests/e2e/vocabulary-browse.spec.ts`, test 4 toggles "hola" known→unknown→known. If the test fails mid-toggle, "hola" is left unknown. Add an `afterAll` that ensures "hola" is restored to known state by POSTing to `/api/words/known`.

### Step B4: Verify tests pass individually

- [ ] Run each modified test individually:
```bash
cd apps/platform && E2E_DATABASE_URL="postgres://admin:password@127.0.0.1:5432/notflix_e2e" pnpm exec playwright test tests/e2e/creator-upload.spec.ts --reporter=list
```
Repeat for `profile-settings.spec.ts` and `vocabulary-browse.spec.ts`.

### Step B5: Commit

```bash
git add apps/platform/tests/e2e/creator-upload.spec.ts apps/platform/tests/e2e/profile-settings.spec.ts apps/platform/tests/e2e/vocabulary-browse.spec.ts
git commit -m "fix: add afterAll cleanup to state-mutating E2E tests for batch isolation"
```

---

## Task C: Fix VocabularyPage Placeholder

**Why:** `VocabularyPage.ts` searchInput uses placeholder `"Search words..."` but the actual vocabulary page may use `"Search lemmas..."`. This mismatch causes page object methods to fail silently.

**Files:**
- Modify: `tests/pages/VocabularyPage.ts`

### Step C1: Check actual placeholder on vocabulary page

- [ ] Read `src/routes/vocabulary/+page.svelte` to find the actual search input placeholder text.

### Step C2: Update VocabularyPage to match

- [ ] Update `tests/pages/VocabularyPage.ts` searchInput locator to use the correct placeholder, or use a more robust selector (e.g., `input[type="search"]` or `input[data-testid="vocab-search"]`).

### Step C3: Verify vocabulary tests pass

- [ ] Run: `cd apps/platform && E2E_DATABASE_URL="postgres://admin:password@127.0.0.1:5432/notflix_e2e" pnpm exec playwright test tests/e2e/vocabulary-browse.spec.ts --reporter=list`
Expected: 4 passed

### Step C4: Commit

```bash
git add apps/platform/tests/pages/VocabularyPage.ts
git commit -m "fix: align VocabularyPage searchInput selector with actual placeholder"
```

---

## Task D: Full E2E Suite Verification

**Why:** After all blockers are fixed, run the complete suite in batch to verify everything passes together.

**Files:** None (verification only)

### Step D1: Run full Playwright suite

- [ ] Run:
```bash
cd apps/platform && E2E_DATABASE_URL="postgres://admin:password@127.0.0.1:5432/notflix_e2e" pnpm exec playwright test --reporter=list
```
Expected: 1 skipped (auth-flow), 20 passed, 0 failed

### Step D2: Run unit tests (regression check)

- [ ] Run: `cd apps/platform && pnpm run test:unit 2>&1 | tail -8`
Expected: 277 passed, 0 failed

### Step D3: Run integration tests (regression check)

- [ ] Run: `cd apps/platform && DATABASE_URL="postgres://admin:password@127.0.0.1:5432/notflix_e2e" pnpm run test:integration 2>&1 | tail -8`
Expected: 11 passed, 0 failed

### Step D4: Run lint + typecheck

- [ ] Run:
```bash
cd apps/platform && pnpm exec biome lint . 2>&1 | grep "Found" && pnpm exec svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -3
```
Expected: 0 errors from biome, 0 errors from svelte-check

---

## Execution Order

Tasks A, B, C are **independent** and can run in **parallel** as separate agents.
Task D depends on A, B, C all being complete — run after all three land.

```
Task A (E2E hook) ──────┐
Task B (isolation) ─────┤──→ Task D (full verification)
Task C (placeholder) ───┘
```
