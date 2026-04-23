# Notflix Application Bug Report

**Date:** 2026-04-22
**Environment:** Local dev (SvelteKit + PostgreSQL + Supabase Auth + AI Service)
**Tester:** Automated walkthrough + code analysis

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High | 8 |
| Medium | 12 |
| Low | 10 |
| **Total** | **35** |

---

## CRITICAL

### 1. No Logout / Sign-Out Functionality
- **Where:** Entire application
- **Details:** There is no logout button, API endpoint, or mechanism anywhere in the app. Users cannot sign out once signed in. The codebase contains zero references to `signOut`, `logout`, `sign_out`, or `log out`.
- **Impact:** Users are permanently logged in until cookies expire (1 hour). Shared devices are completely insecure.
- **Category:** Functionality / Security

### 2. Hardcoded Demo Credentials in Client-Side Code
- **Where:** `src/routes/login/+page.svelte:59-70`
- **Details:** Demo login embeds `test@example.com` / `password123` in client-side JavaScript. Anyone viewing page source can see these credentials.
- **Impact:** If a real user registers that email, their account is compromised. The credentials are publicly exposed.
- **Category:** Security

### 3. No File Size Limit on Upload (Server-Side)
- **Where:** `src/routes/studio/upload/+page.server.ts:89-102`
- **Details:** UI claims "Max 500MB" but the server never checks file size. The entire file is read into memory via `file.arrayBuffer()` before writing to disk.
- **Impact:** Denial-of-service via memory exhaustion. An attacker can upload arbitrarily large files.
- **Category:** Security

### 4. No Server-Side File Type Validation
- **Where:** `src/routes/studio/upload/+page.server.ts:93`
- **Details:** The file extension is taken from `file.name.split(".").pop()` with no MIME type check, no magic-byte validation, and no extension whitelist. Only client-side `accept="video/*,audio/*"` exists.
- **Impact:** Arbitrary file upload (`.html`, `.js`, `.svg`) could lead to stored XSS or RCE if the upload directory is served statically.
- **Category:** Security

### 5. Error Page Leaks Internal Details
- **Where:** `src/routes/+error.svelte:28-33`
- **Details:** Renders `page.error.message` directly, which can include stack traces, internal paths, database error messages.
- **Impact:** Information disclosure to attackers.
- **Category:** Security

---

## HIGH

### 6. No Ownership Check on Video Delete
- **Where:** `src/routes/api/videos/[id]/+server.ts:6-29`
- **Details:** Any authenticated user can delete any video by ID. No check that the video belongs to the requesting user.
- **Impact:** Any user can wipe another user's content.
- **Category:** Security

### 7. No Ownership Check on Reprocess Action
- **Where:** `src/routes/studio/+page.server.ts:62-85`
- **Details:** Any authenticated user can trigger reprocessing of any video by ID.
- **Category:** Security

### 8. Unauthenticated Watch Page Exposes Video Data
- **Where:** `src/routes/watch/[id]/+page.server.ts:70-127`
- **Details:** The watch page load function does not require authentication. It exposes file paths, processing status, VTT/subtitle content, and user profiles to anyone who knows a video UUID.
- **Category:** Security

### 9. Homepage Exposes All Videos Without Auth
- **Where:** `src/routes/+page.server.ts:127-143`
- **Details:** Home page fetches all videos from DB and returns them even for unauthenticated users, including thumbnail paths, processing status, and progress data.
- **Category:** Security

### 10. UUID Parameters Not Validated Before DB Queries
- **Where:** `src/routes/api/videos/[id]/+server.ts`, `src/routes/api/game/generate/+server.ts`, and all `[id]` routes
- **Details:** Passing a non-UUID string (e.g., `"nonexistent"`) causes a raw Postgres error (`invalid input syntax for type uuid`) instead of a clean 404. This leaks database internals.
- **Category:** Security / Error Handling

### 11. Vocabulary Seed Script Has Hardcoded Wrong DB URL
- **Where:** `src/lib/server/db/seed.ts:10`
- **Details:** Fallback connection string is `postgres://admin:password@127.0.0.1:5432/main_db` but the actual DB is `postgres://postgres:password@.../postgres`. Running seed without `DATABASE_URL` env var silently fails or errors.
- **Category:** Functionality

### 12. Seed Script CSV Path Relative to CWD Breaks in Docker
- **Where:** `src/lib/server/db/seed.ts:21`
- **Details:** `path.resolve(process.cwd(), 'assets/vocab/es/...')` resolves relative to CWD. CSV files live at the monorepo root (`/assets/vocab/es/`) but the Docker init-db runs from `/app/apps/platform/`. Result: vocab_reference table stays empty, vocabulary page shows 0 words.
- **Impact:** Fresh deployments have no vocabulary data.
- **Category:** Functionality

### 13. `reprocess` Action Returns `{ success: false }` Instead of `fail()`
- **Where:** `src/routes/studio/+page.server.ts:72`
- **Details:** Returns plain object with 200 status instead of SvelteKit's `fail()`. The `use:enhance` client cannot distinguish between success and error.
- **Category:** Functionality

---

## MEDIUM

### 14. Vocabulary Page Is Browse-Only - No Activate/Deactivate Words
- **Where:** `src/routes/vocabulary/+page.svelte`
- **Details:** Users can browse and search vocabulary but cannot activate/deactivate words for their personal vocabulary. No "Add to Known" or "Remove" buttons exist per word. The only way to mark words as known is through the swipe game during video playback.
- **Category:** Functionality / UX

### 15. `isLoading` Not Reset on Successful Demo Login
- **Where:** `src/routes/login/+page.svelte:54-78`
- **Details:** After successful demo login, `isLoading` stays `true` forever (no `finally` block). The button stays disabled with "Processing..." if navigation is slow.
- **Category:** UX

### 16. "More Info" Button on Homepage Does Nothing
- **Where:** `src/routes/+page.svelte` (button uid=24_17)
- **Details:** Clicking "More Info" has no visible effect. No modal, no scroll, no navigation.
- **Category:** Functionality / UX

### 17. Trending Card "+" Buttons Do Nothing
- **Where:** `src/routes/+page.svelte` (buttons on trending cards)
- **Details:** The small buttons on each trending card (likely add-to-list) have no click handler and no effect.
- **Category:** Functionality / UX

### 18. "Debug Tools" Footer Link Points to Nonexistent Route (404)
- **Where:** `src/routes/+layout.svelte:213-218`
- **Details:** Links to `/debug` which returns a 404. No debug route exists.
- **Category:** Functionality

### 19. "untitled page" Announced by Screen Reader on Every Navigation
- **Where:** Observed in live region (`aria-live="assertive"`) on every page load
- **Details:** The text "untitled page" is announced via the SvelteKit live region after each navigation, confusing screen reader users.
- **Category:** Accessibility

### 20. Password Minimum Length Inconsistency (Login: 6 vs Register: 8)
- **Where:** `src/routes/login/+page.svelte:35` vs `src/routes/register/+page.svelte:7`
- **Details:** Login validates `password.length < 6` while register validates `MIN_PASSWORD_LENGTH = 8`. A user could register with 8+ chars but be confused when login rejects a 7-char password attempt.
- **Category:** UX

### 21. `$page` Imported from `$app/stores` Instead of `$app/state` (Svelte 5)
- **Where:** `src/routes/login/+page.svelte:6`, `src/routes/vocabulary/+page.svelte:8`
- **Details:** Svelte 5 / SvelteKit 2 deprecated `$app/stores` in favor of `$app/state`. The error page already uses the correct import. These two files will break in future versions.
- **Category:** Functionality (future breakage)

### 22. `ilike` Search Not Escaped for `%` and `_` Wildcards
- **Where:** `src/routes/vocabulary/+page.server.ts:81-83`
- **Details:** User search is interpolated into `` ilike(vocabReference.lemma, `%${search}%`) `` without escaping SQL LIKE wildcards. Searching for `%` returns all rows.
- **Category:** Functionality

### 23. Startup Cleanup Marks ALL Pending Processing as ERROR (Race Condition)
- **Where:** `src/hooks.server.ts:52-55`
- **Details:** On startup, all `PENDING` processing records are set to `ERROR`. In multi-worker deployments, this would kill legitimate in-progress tasks.
- **Category:** Functionality

### 24. Register Page Links Don't Use `base` Path
- **Where:** `src/routes/login/+page.svelte:175`, `src/routes/register/+page.svelte:168`
- **Details:** Links like `href="/register"` and `href="/login"` don't prepend `$base`. Breaks if app is deployed under a subpath.
- **Category:** Functionality

### 25. Game API Returns 500 Instead of 404 for Invalid Video
- **Where:** `src/routes/api/game/generate/+server.ts`
- **Details:** Requesting game cards for a nonexistent videoId returns `{"message":"Internal Error"}` (500) instead of a proper 404.
- **Category:** Error Handling

---

## LOW

### 26. Trending Cards Not Keyboard Accessible
- **Where:** `src/routes/+page.svelte:87-129`
- **Details:** Trending cards are `<div>` elements with no `role`, `tabindex`, or keyboard handlers. Cannot be activated via keyboard.
- **Category:** Accessibility

### 27. Video Player Component Exists but Watch Page Uses Raw `<video>`
- **Where:** `src/lib/components/player/VideoPlayer.svelte` vs `src/routes/watch/[id]/+page.svelte`
- **Details:** A full 585-line `VideoPlayer.svelte` component with custom controls, subtitles, and game overlay exists but the actual watch page uses a raw `<video>` with native controls. Two divergent player implementations.
- **Category:** Code Quality

### 28. `handleAnswerSubmitted` Doesn't Await `fetch`
- **Where:** `src/routes/watch/[id]/+page.svelte:125-143`
- **Details:** Fires `fetch()` to `/api/words/known` without `await`. If it fails, user gets no feedback and thinks the word was marked as known.
- **Category:** UX

### 29. `handleGameComplete` Duplicates `advanceChunk` Logic
- **Where:** `src/routes/watch/[id]/+page.svelte:47-51, 118-123`
- **Details:** Both increment `chunkIndex` and call `initNextInterrupt()` but via duplicated code rather than calling the same function. Fragile maintenance.
- **Category:** Code Quality

### 30. Watch Page Mutates DB Row Object
- **Where:** `src/routes/watch/[id]/+page.server.ts:112-114`
- **Details:** Does `vid.filePath = toMediaUrl(vid.filePath)`, mutating the object returned from the database query.
- **Category:** Code Quality

### 31. Unused `HTTP_STATUS_SEE_OTHER` Shadows Imported Constant
- **Where:** `src/routes/profile/+page.server.ts:21`
- **Details:** Local `const HTTP_STATUS_SEE_OTHER = 303` shadows the already-imported `HTTP_STATUS.SEE_OTHER`.
- **Category:** Code Quality

### 32. `isSubmitting` Not Reset When Upload Redirects
- **Where:** `src/routes/studio/upload/+page.svelte:53-64`
- **Details:** On successful upload, the server throws a redirect. The `isSubmitting = false` line never executes. If redirect fails, the form is stuck in "Uploading...".
- **Category:** UX

### 33. `sessionCache` Is Misleadingly Named
- **Where:** `src/hooks.server.ts:67-76`
- **Details:** Scoped to each `handle()` call (per-request), not across requests. Name implies cross-request caching.
- **Category:** Code Quality

### 34. `profileSchema` Uses Raw `gameInterval` Instead of Zod-Validated `result.data`
- **Where:** `src/routes/profile/+page.server.ts:61-65, 76`
- **Details:** Parses form data with Zod but then uses the raw string for `parseInt()` instead of the validated output.
- **Category:** Code Quality

### 35. Subtitle API Uses `Cache-Control: public` for User Content
- **Where:** `src/routes/api/videos/[id]/subtitles/+server.ts`
- **Details:** Cached for 1 hour with `public` directive, meaning CDNs/proxies may serve authenticated user's subtitle data to unauthenticated users.
- **Category:** Security (minor)

---

## Testing Methodology

1. **Server started** locally via `pnpm run dev` with Docker PostgreSQL, Kong, GoTrue auth, and AI service
2. **Account lifecycle tested**: Register new account, clear cookies, re-login with credentials
3. **All routes visited**: `/`, `/login`, `/register`, `/studio`, `/studio/upload`, `/vocabulary`, `/profile`, `/watch/999`, `/test/player`, `/debug`
4. **Form validation tested**: Empty fields, invalid email, mismatched passwords, empty file upload
5. **API endpoints tested**: `/api/health`, `/api/videos` (unauth), `/api/words/known`, `/api/game/generate`, `/api/videos/[id]` DELETE
6. **Code analysis**: Full source code reviewed for security, functionality, accessibility, and code quality issues
7. **Docker Compose tested**: `init-db` container fails due to missing `drizzle-kit` and wrong CSV paths
