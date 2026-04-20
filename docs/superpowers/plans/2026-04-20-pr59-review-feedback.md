# PR #59 Review Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all 8 CodeRabbit review findings on PR #59 — fix a path-traversal security vulnerability, an ESM `__dirname` bug, a missing `await` in `vi.mock`, add missing MIME type, fix boundary overlap, clamp progress percent, redact array elements, and fix path separator assertion on Windows.

**Architecture:** Each fix is independent and touches a different file. Tasks are ordered by severity (critical → minor). All fixes include test updates where needed.

**Tech Stack:** TypeScript, Vitest, Node.js path module

---

## Summary of Feedback Items (by severity)

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | 🔴 Critical | `media-path-security.ts` | Path traversal bypass — `startsWith` is insufficient |
| 2 | 🔴 Critical | `ai-service-contract.test.ts` | `__dirname` undefined in ESM |
| 3 | 🟠 Major | `media-path-security.ts` | Missing `.webm` MIME type |
| 4 | 🟠 Major | `redact.ts` | Arrays not redacted — secrets leak in array elements |
| 5 | 🟡 Minor | `video-player-utils.ts` | Boundary overlap with `<= subtitle.end` |
| 6 | 🟡 Minor | `video-player-utils.ts` | Progress percent not clamped to 0–100 |
| 7 | 🟡 Minor | `seed.test.ts` | `vi.importActual()` not awaited |
| 8 | 🟡 Minor | `config.test.ts` | Path separator assertion fails on Windows |

---

### Task 1: Fix path traversal vulnerability in media-path-security (🔴 Critical)

**Files:**
- Modify: `apps/platform/src/lib/server/utils/media-path-security.ts:28-46`
- Modify: `apps/platform/src/lib/server/utils/media-path-security.test.ts`

- [ ] **Step 1: Update `resolveMediaPath` to use canonical path check**

In `media-path-security.ts`, replace the `path.join` + `startsWith` logic with `path.resolve` + `path.relative`:

```typescript
export function resolveMediaPath(
  filePath: string | undefined,
  mediaRoot: string,
): ResolvedMediaPath {
  if (!filePath) {
    throw new MediaPathError(400, "Missing file path");
  }

  const resolvedMediaRoot = path.resolve(mediaRoot);
  const fullPath = path.resolve(resolvedMediaRoot, filePath);

  const relativePath = path.relative(resolvedMediaRoot, fullPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new MediaPathError(403, "Forbidden");
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = CONTENT_TYPE_MAP[ext] || DEFAULT_CONTENT_TYPE;

  return { fullPath, contentType };
}
```

- [ ] **Step 2: Add sibling-prefix traversal test**

In `media-path-security.test.ts`, add after the existing `WhenPathTraversalWithDotDot_ThenRejected` test:

```typescript
  it(
    "WhenSiblingPrefixTraversal_ThenRejected",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      let caught: MediaPathError | undefined;
      try {
        resolveMediaPath("../media-evil/file.mp4", mediaRoot);
      } catch (err) {
        caught = err as MediaPathError;
      }
      expect(caught).toBeInstanceOf(MediaPathError);
      expect(caught?.statusCode).toBe(403);
    },
  );
```

- [ ] **Step 3: Run tests to verify**

Run: `npx vitest run apps/platform/src/lib/server/utils/media-path-security.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform/src/lib/server/utils/media-path-security.ts apps/platform/src/lib/server/utils/media-path-security.test.ts
git commit -m "fix(security): use canonical path check in resolveMediaPath to prevent traversal bypass"
```

---

### Task 2: Fix `__dirname` usage in ESM test (🔴 Critical)

**Files:**
- Modify: `apps/platform/src/lib/server/services/ai-service-contract.test.ts:1-17`

- [ ] **Step 1: Replace `__dirname` with `import.meta.url`**

In `ai-service-contract.test.ts`, update imports and path resolution:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
```

Replace the `openApiPath` constant:

```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openApiPath = join(
  __dirname,
  "../../../../../../apps/ai-service/openapi.json",
);
```

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run apps/platform/src/lib/server/services/ai-service-contract.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/platform/src/lib/server/services/ai-service-contract.test.ts
git commit -m "fix: replace __dirname with import.meta.url in ESM test"
```

---

### Task 3: Add `.webm` MIME type (🟠 Major)

**Files:**
- Modify: `apps/platform/src/lib/server/utils/media-path-security.ts:3-11`
- Modify: `apps/platform/src/lib/server/utils/media-path-security.test.ts:60-69`

- [ ] **Step 1: Add `.webm` to CONTENT_TYPE_MAP**

In `media-path-security.ts`, update the map:

```typescript
const CONTENT_TYPE_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
```

- [ ] **Step 2: Add `.webm` test case**

In `media-path-security.test.ts`, add to the `cases` array in `WhenValidContentTypeMapping_ThenCorrectType`:

```typescript
        ["file.webm", "video/webm"],
```

- [ ] **Step 3: Run tests to verify**

Run: `npx vitest run apps/platform/src/lib/server/utils/media-path-security.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform/src/lib/server/utils/media-path-security.ts apps/platform/src/lib/server/utils/media-path-security.test.ts
git commit -m "fix: add .webm MIME type to media content-type map"
```

---

### Task 4: Redact array elements in redact utility (🟠 Major)

**Files:**
- Modify: `apps/platform/src/lib/server/utils/redact.ts`
- Modify: `apps/platform/src/lib/server/utils/redact.test.ts`

- [ ] **Step 1: Update `redact.ts` to handle arrays**

Replace entire `redact.ts`:

```typescript
const SENSITIVE_KEYS = new Set([
  "token",
  "password",
  "secret",
  "authorization",
  "cookie",
]);

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value !== null && typeof value === "object") {
    return redact(value as Record<string, unknown>);
  }
  return value;
}

export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      newObj[key] = "[REDACTED]";
    } else {
      newObj[key] = redactValue(value);
    }
  }
  return newObj;
}
```

- [ ] **Step 2: Update test `WhenArrayValue_ThenPreservesArrayWithoutRecursion`**

In `redact.test.ts`, replace the existing array test:

```typescript
  it(
    "WhenArrayValue_ThenRecursivelyRedacts",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({ items: [{ password: "inner" }], name: "test" });
      expect(result).toEqual({ items: [{ password: "[REDACTED]" }], name: "test" });
    },
  );
```

- [ ] **Step 3: Add nested-array test**

In `redact.test.ts`, add a new test:

```typescript
  it(
    "WhenArrayWithNestedObjects_ThenRedactsAll",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({
        data: [
          { token: "a", safe: "x" },
          { secret: "b", name: "y" },
        ],
      });
      expect(result).toEqual({
        data: [
          { token: "[REDACTED]", safe: "x" },
          { secret: "[REDACTED]", name: "y" },
        ],
      });
    },
  );
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run apps/platform/src/lib/server/utils/redact.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/platform/src/lib/server/utils/redact.ts apps/platform/src/lib/server/utils/redact.test.ts
git commit -m "fix: redact sensitive keys inside arrays and use Set for lookup"
```

---

### Task 5: Fix subtitle boundary overlap (🟡 Minor)

**Files:**
- Modify: `apps/platform/src/lib/components/player/video-player-utils.ts:101-102`
- Modify: `apps/platform/src/lib/components/player/video-player-utils.test.ts:293-303`

- [ ] **Step 1: Change `<=` to `<` for end-exclusive interval**

In `video-player-utils.ts`, line 102:

```typescript
  const isCurrent =
    currentTime >= subtitle.start && currentTime < subtitle.end;
```

- [ ] **Step 2: Update the boundary test**

In `video-player-utils.test.ts`, replace the `WhenExactBoundary_ThenReturnsActiveClass` test:

```typescript
  it(
    "WhenStartBoundary_ThenReturnsActiveClass",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      expect(getTranscriptItemClass(0, base)).toBe(
        "border-amber-400/70 bg-white/10",
      );
    },
  );

  it(
    "WhenEndBoundary_ThenReturnsNonActiveClass",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      expect(getTranscriptItemClass(5, base)).toBe("border-white/10");
    },
  );
```

- [ ] **Step 3: Run tests to verify**

Run: `npx vitest run apps/platform/src/lib/components/player/video-player-utils.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform/src/lib/components/player/video-player-utils.ts apps/platform/src/lib/components/player/video-player-utils.test.ts
git commit -m "fix: use end-exclusive interval for transcript item highlight"
```

---

### Task 6: Clamp progress percent to 0–100 (🟡 Minor)

**Files:**
- Modify: `apps/platform/src/lib/components/player/video-player-utils.ts:159-164`
- Modify: `apps/platform/src/lib/components/player/video-player-utils.test.ts:397-409`

- [ ] **Step 1: Add clamping logic**

In `video-player-utils.ts`, replace `calcProgressPercent`:

```typescript
export function calcProgressPercent(
  currentTime: number,
  duration: number,
): number {
  const roundedCurrent = Math.round(currentTime);
  const roundedDuration = Math.round(duration);
  if (roundedDuration <= 0) return 0;
  const percent = (roundedCurrent / roundedDuration) * PERCENTAGE_BASE;
  return Math.min(PERCENTAGE_BASE, Math.max(0, percent));
}
```

- [ ] **Step 2: Add edge-case tests**

In `video-player-utils.test.ts`, add after `WhenComplete_ThenReturns100`:

```typescript
  it("WhenOverflow_ThenClampsTo100", { timeout: TEST_TIMEOUT_MS }, () => {
    expect(calcProgressPercent(150, 100)).toBe(100);
  });

  it("WhenNegativeTime_ThenClampsToZero", { timeout: TEST_TIMEOUT_MS }, () => {
    expect(calcProgressPercent(-10, 100)).toBe(0);
  });
```

- [ ] **Step 3: Run tests to verify**

Run: `npx vitest run apps/platform/src/lib/components/player/video-player-utils.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform/src/lib/components/player/video-player-utils.ts apps/platform/src/lib/components/player/video-player-utils.test.ts
git commit -m "fix: clamp progress percent to 0-100 range"
```

---

### Task 7: Await `vi.importActual()` in seed test (🟡 Minor)

**Files:**
- Modify: `apps/platform/src/lib/server/db/seed.test.ts:16-20`

- [ ] **Step 1: Make mock factory async and await importActual**

In `seed.test.ts`, replace the `node:fs` mock:

```typescript
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: mockReadFileSync,
    existsSync: () => false,
  };
});
```

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run apps/platform/src/lib/server/db/seed.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/platform/src/lib/server/db/seed.test.ts
git commit -m "fix: await vi.importActual in seed test mock factory"
```

---

### Task 8: Normalize path separators in config test (🟡 Minor)

**Files:**
- Modify: `apps/platform/src/lib/server/infrastructure/config.test.ts:30-33`

- [ ] **Step 1: Normalize path in assertion**

In `config.test.ts`, replace the assertion in `WhenRelativePath_ThenResolvesAgainstCwd`:

```typescript
      const result = resolveUploadDir("media/uploads", false);
      expect(path.isAbsolute(result)).toBe(true);
      expect(path.normalize(result)).toContain(
        path.normalize("media/uploads"),
      );
```

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run apps/platform/src/lib/server/infrastructure/config.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/platform/src/lib/server/infrastructure/config.test.ts
git commit -m "fix: normalize path separators in cross-platform config test"
```

---

## Post-Implementation: Run Full Test Suite

- [ ] **Run all affected tests**

```bash
npx vitest run apps/platform/src/lib/server/utils/media-path-security.test.ts apps/platform/src/lib/server/services/ai-service-contract.test.ts apps/platform/src/lib/server/utils/redact.test.ts apps/platform/src/lib/components/player/video-player-utils.test.ts apps/platform/src/lib/server/db/seed.test.ts apps/platform/src/lib/server/infrastructure/config.test.ts
```

Expected: All tests pass
