# Bugfix Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 categories of bugs by making 10 failing tests pass — UUID validation, upload file validation, words-known input validation, reprocess action validation, and game-generate UUID validation.

**Architecture:** Each task targets one source file, adds validation logic, and runs the corresponding test file to verify the fix. Pure unit tests with mocked dependencies.

**Tech Stack:** Vitest, SvelteKit, Zod, TypeScript

---

### Task 1: UUID Validation on DELETE /api/videos/[id]

**Files:**
- Modify: `src/routes/api/videos/[id]/+server.ts`
- Test: `tests/api/videos-id-uuid-validation.test.ts` (already written, 3 tests, 2 failing)

The DELETE handler must validate that `params.id` is a valid UUID v4 before calling `deleteVideoAndAssets`. Non-UUID strings currently cause a raw Postgres error (500).

- [ ] **Step 1: Add UUID validation to DELETE handler**

In `src/routes/api/videos/[id]/+server.ts`, add a UUID regex check at the top of the handler, before the try/catch:

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DELETE: RequestHandler = async ({ params }) => {
  const { id } = params;

  if (!UUID_RE.test(id)) {
    return json(
      { error: "Invalid video ID: must be a valid UUID" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  try {
    // ... existing code
  }
};
```

- [ ] **Step 2: Run test to verify**

Run: `pnpm exec vitest run tests/api/videos-id-uuid-validation.test.ts`
Expected: 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/videos/[id]/+server.ts tests/api/videos-id-uuid-validation.test.ts
git commit -m "fix: validate UUID on DELETE /api/videos/[id]"
```

---

### Task 2: File Size and Type Validation in Upload Service

**Files:**
- Modify: `src/lib/server/services/upload-video.service.ts`
- Test: `src/lib/server/services/upload-video-validation.test.ts` (already written, 5 tests, 3 failing)

The `handleVideoUpload` function must validate:
1. File size <= `deps.maxFileSizeBytes` (default 500MB)
2. File extension is in an allowed whitelist: `mp4`, `mp3`, `wav`, `webm`, `ogg`, `m4a`, `mkv`, `avi`, `mov`
3. File must have an extension

- [ ] **Step 1: Add validation to upload service**

In `src/lib/server/services/upload-video.service.ts`, add validation inside `handleVideoUpload` after the null-file check and before saving:

```ts
const ALLOWED_EXTENSIONS = new Set(["mp4", "mp3", "wav", "webm", "ogg", "m4a", "mkv", "avi", "mov"]);
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
```

Add checks for extension and size, returning `{ ok: false, value: { errors: { file: [...] } } }` when they fail. Check extension via `file.name.split(".").pop()?.toLowerCase()`.

- [ ] **Step 2: Run test to verify**

Run: `pnpm exec vitest run src/lib/server/services/upload-video-validation.test.ts`
Expected: 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/upload-video.service.ts src/lib/server/services/upload-video-validation.test.ts
git commit -m "fix: add file size and type validation to upload service"
```

---

### Task 3: Input Validation on POST /api/words/known

**Files:**
- Modify: `src/routes/api/words/known/+server.ts`
- Test: `tests/api/words-known-validation.test.ts` (already written, 2 tests, 2 failing)

The endpoint must validate:
1. `lemma` is a string with max length 200
2. `lang` is a 2-5 character string matching `/^[a-z]{2,5}$/i`

- [ ] **Step 1: Add Zod schema validation**

In `src/routes/api/words/known/+server.ts`, add a Zod schema and validate before DB insert:

```ts
import { z } from "zod";

const knownWordSchema = z.object({
  lemma: z.string().min(1).max(200),
  lang: z.string().regex(/^[a-z]{2,5}$/i, "lang must be a 2-5 letter language code"),
});
```

Parse the body, return 400 if validation fails.

- [ ] **Step 2: Run test to verify**

Run: `pnpm exec vitest run tests/api/words-known-validation.test.ts`
Expected: 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/words/known/+server.ts tests/api/words-known-validation.test.ts
git commit -m "fix: add input validation to POST /api/words/known"
```

---

### Task 4: Reprocess Action Uses fail() for Invalid Input

**Files:**
- Modify: `src/routes/studio/+page.server.ts`
- Test: `tests/api/studio-reprocess.test.ts` (already written, 2 tests, 2 failing)

The `reprocess` action returns `{ success: false }` (200) instead of using SvelteKit's `fail()`.

- [ ] **Step 1: Replace bare returns with fail()**

In `src/routes/studio/+page.server.ts`, import `fail` from `@sveltejs/kit` and change:

```ts
if (!id || !session) return { success: false };
```

to:

```ts
if (!session) return fail(HTTP_STATUS.UNAUTHORIZED, { error: "Not authenticated" });
if (!id) return fail(HTTP_STATUS.BAD_REQUEST, { error: "Video ID is required" });
```

- [ ] **Step 2: Run test to verify**

Run: `pnpm exec vitest run tests/api/studio-reprocess.test.ts`
Expected: 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/routes/studio/+page.server.ts tests/api/studio-reprocess.test.ts
git commit -m "fix: use fail() in reprocess action for proper HTTP status codes"
```

---

### Task 5: UUID Validation on GET /api/game/generate

**Files:**
- Modify: `src/routes/api/game/generate/+server.ts`
- Test: `tests/api/game-generate-validation.test.ts` (already written, 1 test, 1 failing)

The handler must validate `videoId` is a valid UUID before calling `generateDeck`.

- [ ] **Step 1: Add UUID validation**

In `src/routes/api/game/generate/+server.ts`, add the same UUID regex check after extracting `videoId` from URL params:

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// After getting videoId:
if (!videoId || !UUID_RE.test(videoId)) {
  return json({ error: "videoId must be a valid UUID" }, { status: HTTP_STATUS.BAD_REQUEST });
}
```

- [ ] **Step 2: Run test to verify**

Run: `pnpm exec vitest run tests/api/game-generate-validation.test.ts`
Expected: 1 test PASS

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/game/generate/+server.ts tests/api/game-generate-validation.test.ts
git commit -m "fix: validate videoId UUID on GET /api/game/generate"
```

---

## Verification

After all tasks, run the full test suite:

```bash
pnpm exec vitest run
```

All existing tests plus the 10 new tests should pass.
