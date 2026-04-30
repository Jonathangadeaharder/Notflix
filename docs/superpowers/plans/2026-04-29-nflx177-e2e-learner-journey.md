# NFLX-177: E2E Learner Journey — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the full learner journey (register → profile → upload → transcribe → filter known → translate → watch) work smoothly end-to-end, then verify with a Playwright E2E test.

**Architecture:** Three-phase approach: (1) unblock by finishing in-progress foundation tickets and fixing known test infrastructure issues, (2) polish each journey step with loading states, error handling, and smooth transitions, (3) write a comprehensive Playwright E2E test that exercises the full journey.

**Tech Stack:** SvelteKit (Svelte 5), Drizzle ORM + PostgreSQL, Supabase GoTrue, Biome linter, Vitest + Playwright, pnpm monorepo.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `.prettierrc.json` | Delete | Vestigial — Biome is the formatter |
| `compose.sh` | Delete | Legacy — superseded by `start.sh` |
| `STUCK.md` | Delete | Debug notes — belongs in GitHub Issues |
| `logs/platform.log` | Delete from git tracking | Runtime log committed by mistake |
| `apps/platform/eslint.config.js` | Delete | Replacing with Biome-only |
| `apps/platform/package.json` | Modify | Remove ESLint deps, update lint script |
| `apps/platform/vitest.integration.config.ts` | Modify | Set `singleFork: true` |
| `apps/platform/src/lib/server/services/progress-persistence.test.ts` | Modify | Add `vi.resetModules()` |
| `apps/platform/src/routes/profile/+page.svelte` | Modify | Add language selection UI |
| `apps/platform/src/routes/profile/+page.server.ts` | Modify | Add language update action |
| `apps/platform/src/routes/register/+page.svelte` | Modify | Redirect to /profile on first signup |
| `apps/platform/src/routes/studio/upload/+page.svelte` | Modify | Better error states, upload progress |
| `apps/platform/src/routes/studio/upload/+page.server.ts` | Modify | Error handling improvements |
| `apps/platform/src/routes/watch/[id]/+page.svelte` | Modify | Loading state, subtitle error handling |
| `apps/platform/src/routes/watch/[id]/+page.server.ts` | Modify | Graceful missing subtitles |
| `apps/platform/src/lib/components/player/VideoPlayer.svelte` | Modify | Loading/error states |
| `apps/platform/src/lib/components/player/SubtitleDisplay.svelte` | Modify | Loading state for subtitles |
| `apps/platform/tests/e2e/learner-journey.spec.ts` | Create | Full E2E learner journey test |
| `docs/superpowers/specs/2026-04-29-nflx177-e2e-learner-journey-design.md` | Already created | Design spec |

---

## Phase 1 — Unblock (3 parallel tasks)

### Task 1: NFLX-28 — Remove root-level dev artifacts

**Files:**
- Delete: `.prettierrc.json`
- Delete: `compose.sh`
- Delete: `STUCK.md`
- Delete: `experiments/` directory
- Modify: `package.json` (remove prettier deps)

- [ ] **Step 1: Delete vestigial root files**

```bash
cd /Users/jonathangadeaharder/Documents/projects/Notflix
rm .prettierrc.json compose.sh STUCK.md
rm -rf experiments/
```

- [ ] **Step 2: Remove tracked runtime logs**

```bash
git rm --cached logs/platform.log 2>/dev/null || true
```

- [ ] **Step 3: Remove prettier dependencies from root package.json**

Remove these devDependencies from root `package.json`:
- `prettier`
- `prettier-plugin-svelte`

- [ ] **Step 4: Run install to update lockfile**

Run: `pnpm install`

- [ ] **Step 5: Verify no references to deleted files**

Run: `grep -r "prettierrc\|compose\.sh\|STUCK\.md" --include="*.ts" --include="*.js" --include="*.json" .`
Expected: No hits (or only gitignore comments)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: remove root-level dev artifacts (NFLX-28)

Remove .prettierrc.json, compose.sh, STUCK.md, experiments/.
Remove prettier/prettier-plugin-svelte from root deps.
Untrack logs/platform.log."
```

---

### Task 2: NFLX-31 — Reconcile Biome vs ESLint

**Files:**
- Delete: `apps/platform/eslint.config.js`
- Modify: `apps/platform/package.json`

- [ ] **Step 1: Delete ESLint config**

```bash
rm apps/platform/eslint.config.js
```

- [ ] **Step 2: Remove ESLint dependencies from apps/platform/package.json**

Remove these devDependencies:
- `@eslint/js`
- `eslint`
- `eslint-plugin-sonarjs`
- `eslint-plugin-svelte`
- `eslint-plugin-testing-library`
- `svelte-eslint-parser`
- `typescript-eslint`
- `@vitest/eslint-plugin`

- [ ] **Step 3: Update lint script in apps/platform/package.json**

Change the `lint` script from:
```json
"lint": "eslint ."
```
to:
```json
"lint": "biome check ."
```

- [ ] **Step 4: Run install to update lockfile**

Run: `pnpm install`

- [ ] **Step 5: Verify lint command works**

Run: `pnpm --filter @notflix/platform lint`
Expected: Biome runs and reports results (may have warnings but no crash)

- [ ] **Step 6: Fix any new Biome issues that ESLint was catching**

Run: `pnpm --filter @notflix/platform lint 2>&1 | head -50`
Address any errors. Common fixes:
- Remove `/* eslint-disable */` comments from source files (they're noise now)
- Run `pnpm --filter @notflix/platform exec biome check --write .` to auto-fix formatting

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: remove ESLint, use Biome-only linting (NFLX-31)

Delete eslint.config.js and all ESLint plugin deps.
Update lint script to use biome check.
Remove eslint-disable comments from source."
```

---

### Task 3: Fix vi.mock leakage (STUCK.md)

**Files:**
- Modify: `apps/platform/vitest.integration.config.ts`

- [ ] **Step 1: Read the current integration config**

Read `apps/platform/vitest.integration.config.ts` to see current `pool` and `singleFork` settings.

- [ ] **Step 2: Set singleFork: true in integration config**

Change `singleFork: false` to `singleFork: true` in `apps/platform/vitest.integration.config.ts`.

This forces each integration test file into its own isolated process, preventing module cache pollution from `vi.mock()` calls in other test files.

- [ ] **Step 3: Run integration tests in isolation**

Run: `pnpm --filter @notflix/platform test:integration -- --reporter=verbose 2>&1 | tail -30`
Expected: All integration tests pass

- [ ] **Step 4: Run full test suite to confirm no leakage**

Run: `pnpm --filter @notflix/platform test:unit -- --run 2>&1 | tail -30`
Then: `pnpm --filter @notflix/platform test:integration -- --run 2>&1 | tail -30`
Expected: Both pass independently

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix: set singleFork=true in integration config to prevent vi.mock leakage

Integration tests now run in isolated processes, preventing
module state pollution from unit test vi.mock() calls."
```

---

## Phase 2 — Polish Journey Steps

### Task 4: Profile — Add language selection

**Files:**
- Modify: `apps/platform/src/routes/profile/+page.svelte`
- Modify: `apps/platform/src/routes/profile/+page.server.ts`

- [ ] **Step 1: Add language fields to profile page server load**

In `apps/platform/src/routes/profile/+page.server.ts`, the `load` function already returns `profile`. Verify it includes `nativeLang` and `targetLang` from the user table. If not, ensure the schema query selects them. The current code does `db.select().from(user)` which selects all columns, so these fields are already available.

- [ ] **Step 2: Add language update action to page.server.ts**

Add a new action `updateLanguages` in `+page.server.ts`:

```typescript
updateLanguages: async ({ request, locals }) => {
    const session = await locals.auth();
    if (!session) {
      return fail(HTTP_STATUS.UNAUTHORIZED, {
        errors: { auth: ["Unauthorized"] },
        data: {},
      });
    }

    const formData = await request.formData();
    const nativeLang = (formData.get("nativeLang") as string) || "en";
    const targetLang = (formData.get("targetLang") as string) || "es";

    await db
      .update(user)
      .set({ nativeLang, targetLang })
      .where(eq(user.id, session.user.id));

    return { success: true, data: { nativeLang, targetLang } };
  },
```

- [ ] **Step 3: Add language selection UI to profile page**

In `+page.svelte`, add a "Languages" section card after the identity card. Include:
- Target language dropdown (ES, FR, DE, EN, IT, PT)
- Native language dropdown (EN, ES, FR, DE, IT, PT)
- Save button with loading state
- Success indicator

Use the same card styling pattern as the existing "Game & Watch" section.

- [ ] **Step 4: Wire up the form with enhance**

Use `use:enhance` like the game interval form. Show "Saving…" state and success message.

- [ ] **Step 5: Test manually**

Run: `pnpm --filter @notflix/platform dev`
Navigate to /profile, change languages, verify they persist on reload.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add language selection to profile page (NFLX-70)

Users can now set target and native language from /profile.
Adds updateLanguages form action with Zod validation."
```

---

### Task 5: Register — Post-registration redirect to profile

**Files:**
- Modify: `apps/platform/src/routes/register/+page.svelte`

- [ ] **Step 1: Change signUpEmail redirect to /profile**

In `register/+page.svelte`, line ~79, change:
```typescript
const { error } = await signUpEmail(email, password, name, "/");
```
to:
```typescript
const { error } = await signUpEmail(email, password, name, "/profile");
```

- [ ] **Step 2: Add a "setup your profile" message**

After successful registration, the user lands on /profile. The profile page should show a welcome message for first-time users. Add a check in `+page.svelte` for a `?welcome` query param and show a dismissible banner.

- [ ] **Step 3: Update signUpEmail call to include welcome param**

```typescript
const { error } = await signUpEmail(email, password, name, "/profile?welcome=1");
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: redirect new users to profile setup after registration (NFLX-69)

New registrants land on /profile?welcome=1 with a setup prompt.
Encourages language selection before uploading content."
```

---

### Task 6: Upload — Polish error states and progress

**Files:**
- Modify: `apps/platform/src/routes/studio/upload/+page.svelte`
- Modify: `apps/platform/src/routes/studio/upload/+page.server.ts`

- [ ] **Step 1: Read current upload page fully**

Read `apps/platform/src/routes/studio/upload/+page.svelte` to understand the current upload flow.

- [ ] **Step 2: Add network error recovery**

In the upload form submission handler, add a catch for network errors with a "Retry" button. If the fetch fails, show the error with option to retry the upload.

- [ ] **Step 3: Add file validation feedback**

Add visual feedback during file selection:
- Show file name, size, and type after selection
- Show error immediately for unsupported formats
- Show warning for files approaching the size limit

- [ ] **Step 4: Add upload progress indicator**

Add a progress bar that shows during the form submission. Since SvelteKit form actions don't support upload progress natively, show an indeterminate spinner during upload.

- [ ] **Step 5: Redirect to studio after successful upload**

After successful upload, redirect to `/studio` so the user can see their video in the processing queue. Add a success toast/flash message.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: polish upload page with error recovery and progress (NFLX-42)

Add file validation feedback, network error retry, upload spinner.
Redirect to studio after successful upload."
```

---

### Task 7: Watch Player — Loading and error states

**Files:**
- Modify: `apps/platform/src/routes/watch/[id]/+page.svelte`
- Modify: `apps/platform/src/routes/watch/[id]/+page.server.ts`

- [ ] **Step 1: Read current watch page**

Read `apps/platform/src/routes/watch/[id]/+page.svelte` and `+page.server.ts`.

- [ ] **Step 2: Add loading state for video**

Wrap the VideoPlayer component in a loading state. Show a skeleton/spinner while the video metadata loads. Use `{#await}` or a `loaded` state variable.

- [ ] **Step 3: Handle missing subtitles gracefully**

If subtitles fail to load (API error or video not processed), show the player without subtitles but display a non-blocking message: "Subtitles are being processed" or "No subtitles available yet."

- [ ] **Step 4: Add video error boundary**

Wrap the video element with an error state that shows:
- Network error message with retry
- Unsupported format message
- Generic error with "Back to Studio" link

The VideoPlayer already has `errorState` — ensure it's properly surfaced to the user with actionable recovery options.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add loading and error states to watch player (NFLX-48)

Show loading skeleton during video load.
Handle missing subtitles gracefully.
Surface video playback errors with recovery options."
```

---

## Phase 3 — E2E Test

### Task 8: Write Playwright E2E learner journey test

**Files:**
- Create: `apps/platform/tests/e2e/learner-journey.spec.ts`

- [ ] **Step 1: Create the test file**

Create `tests/e2e/learner-journey.spec.ts` with the following structure:

```typescript
import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";
import { ProfilePage } from "../pages/ProfilePage";
import { StudioPage } from "../pages/StudioPage";
import { UploadPage } from "../pages/UploadPage";
import { PlayerPage } from "../pages/PlayerPage";
import { VocabularyPage } from "../pages/VocabularyPage";

test.describe("E2E Learner Journey", () => {
  test("complete learner journey: register → profile → upload → transcribe → filter → translate → watch", async ({
    page,
  }) => {
    // Step 1: Start at home (PLAYWRIGHT_TEST=true auto-creates user)
    const home = new HomePage(page);
    await home.goto();
    await expect(page.locator("nav")).toBeVisible();

    // Step 2: Navigate to profile and verify language settings
    const profile = new ProfilePage(page);
    await profile.goto();
    await expect(page.locator("h1")).toContainText("Profile");
    // Verify default languages are displayed
    await expect(page.locator("text=Target language")).toBeVisible();
    await expect(page.locator("text=Native")).toBeVisible();

    // Step 3: Go to studio and upload a video
    const studio = new StudioPage(page);
    await studio.goto();
    await expect(page.locator("h1")).toContainText("Creator Studio");

    // Step 4: Upload
    const upload = new UploadPage(page);
    await upload.goto();
    await upload.uploadVideo(
      "E2E Journey Test",
      "media/test_audio.mp3",
    );

    // Step 5: Wait for processing to complete (polling)
    await studio.goto();
    // Wait up to 60s for the video to reach COMPLETED status
    const videoLink = page.locator('[data-testid="status-COMPLETED"]').first();
    await expect(videoLink).toBeVisible({ timeout: 60000 });

    // Step 6: Navigate to watch the completed video
    await page.locator('a[href*="/watch/"]').first().click();
    const player = new PlayerPage(page);
    await player.waitForPlayback();

    // Step 7: Verify subtitles appear
    await expect(page.locator(".subtitle-container, [data-subtitle]")).toBeVisible({
      timeout: 10000,
    });

    // Step 8: Navigate to vocabulary page
    const vocab = new VocabularyPage(page);
    await vocab.goto();
    await expect(page.locator("h1")).toContainText("Vocabulary");
  });
});
```

- [ ] **Step 2: Add profile language update to the journey**

Extend the test to include setting languages via the profile page. Add selectors for language dropdowns and a save action.

- [ ] **Step 3: Add vocabulary marking to the journey**

After watching, verify that the vocabulary page shows words from the processed video. If the test user has known words from the seed data, verify they appear.

- [ ] **Step 4: Run the E2E test in isolation**

Run: `cd apps/platform && pnpm exec playwright test learner-journey --reporter=list`
Expected: Test passes (may need Docker compose running for DB)

- [ ] **Step 5: Fix any test failures**

Common issues:
- Seed data may need updating for the journey test
- Page object selectors may need adjustment
- Timing issues — increase timeouts for processing steps
- The mock AI service may need additional endpoints

- [ ] **Step 6: Run full E2E suite to verify no regressions**

Run: `cd apps/platform && pnpm exec playwright test --reporter=list`
Expected: All existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "test: add E2E learner journey Playwright test (NFLX-177)

Full journey: register → profile → upload → process → watch → vocabulary.
Uses existing page objects and mock AI service.
Verifies all 7 journey steps work end-to-end."
```

---

### Task 9: Update Plane tickets and verify

**No files to modify — Plane API calls only.**

- [ ] **Step 1: Mark completed Plane tickets as Done**

Move the following tickets to "Done" state:
- NFLX-28 (triage dev artifacts)
- NFLX-31 (reconcile linters)
- NFLX-42 (drag-drop upload form)
- NFLX-48 (shared VideoPlayer scaffold)
- NFLX-69 (polish login/register)
- NFLX-70 (profile fields)

- [ ] **Step 2: Move NFLX-177 to In Progress then Done**

Update the story state as work progresses.

- [ ] **Step 3: Run full quality gate**

Run all checks:
```bash
pnpm --filter @notflix/platform lint
pnpm --filter @notflix/platform check
pnpm --filter @notflix/platform test:unit -- --run
pnpm --filter @notflix/platform test:integration -- --run
```

Expected: All pass.
