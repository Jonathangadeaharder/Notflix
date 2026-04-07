To validate our event-driven, Hexagonal Architecture (Ports & Adapters) without ever falling into the trap of "monster mocks," we must enforce a testing strategy governed strictly by **Dependency Inversion (ADR-005)**. 

The golden rule for this test suite is: **Tests must only depend on Abstractions (Interfaces/Ports), never on Concretions (Implementations/Adapters).** 

By injecting lightweight, in-memory **Fakes** that implement our interfaces, we guarantee that our core business logic tests will never break, even if we swap OpenAI for a local Llama 3 model or migrate from PostgreSQL to MySQL.

Here is the definitive blueprint for all Unit, Integration, and End-to-End (E2E) tests required to validate the Notflix architecture.

---

### 1. Level 1: Unit Tests (The Functional Core)
**Goal:** Test pure data transformations, state machines, and UI rendering in total isolation. 
**Architectural Rule:** Zero I/O (No DB, no network, no file system). Zero mocking libraries (pass raw data objects that satisfy interfaces). Execution time must be in milliseconds.

#### A. Domain Pure Functions (Node.js & Python)
These functions take primitives and return primitives. They are the easiest to test and the most critical to get right.

| Test Suite | Target | Arrange (Input) | Act | Assert (Output) |
| :--- | :--- | :--- | :--- | :--- |
| **`subtitle-parser.test.ts`** | `parseVtt()` | A raw, malformed `.vtt` string (overlapping timestamps, stray HTML tags). | Call parser. | Returns a perfectly sanitized `ISubtitleToken[]` array (or throws a specific `DomainError`). |
| **`media-utils.test.ts`** | `calculateChunks()` | Video duration: 120s. Max chunk limit: 30s. | Call calculator. | Returns exactly 4 `ITimeSpan` boundary objects. Proves we don't slice audio in the middle of a word. |
| **`test_linguistic_filter.py`** | `filter_cefr()` | Transcript: *"El murciélago bebe leche"*. Target: `B2`. Inject an in-memory CSV dictionary. | Call filter. | Returns `[{word: "murciélago", lemma: "murciélago", level: "B2"}]`. *No LLMs are called.* |

#### B. Svelte UI Components (Vitest + `@testing-library/svelte`)
UI Components must be "dumb." They take interfaces as `export let` props and emit standard Svelte events. They never call SvelteKit's `fetch` or access `$app/stores` directly.

| Test Suite | Target Component | Arrange (Input) | Act (Trigger) | Assert (Output) |
| :--- | :--- | :--- | :--- | :--- |
| **`VideoPlayer.spec.ts`** | `VideoPlayer.svelte` | Pass a dummy video `src` and a mock array of `ISubtitleToken` objects. | Simulate a `timeupdate` event on the HTML `<video>` tag to `00:01:30`. | Assert the DOM renders exactly the subtitle matching that timestamp. |
| **`GameOverlay.spec.ts`** | `GameOverlay.svelte` | Pass an `ILearningSessionState` object set to `QUIZ_ACTIVE` with 4 translated options. | User clicks the correct Spanish translation button. | Assert the component emits an `on:answerSubmitted` custom event. *No backend API mocking required.* |
| **`*.story.svelte`** | **Histoire (Workshop)**| Pass static mock data to the component. | Open the static Histoire URL. | Serves as a visual unit test. Proves to the Designer the component works entirely detached from the backend. |

---

### 2. Level 2: Integration Tests (Adapters & Boundaries)
**Goal:** Verify that our Implementations (Adapters) correctly fulfill our Interfaces (Ports), talk to external systems properly, and that events flow through the decoupled services.

#### A. Database Adapters (Testcontainers)
**Architectural Rule:** *Never mock the database.* If you mock the DB, you are not testing your SQL. Use Docker (Testcontainers) to spin up an ephemeral PostgreSQL instance.

#### B. AI Gateway Contract Tests
**Architectural Rule:** We must prove our adapter parses real LLM JSON correctly, but we cannot hit OpenAI/Claude on every CI run.

| Test Suite | Target Adapter | Testing Strategy & Assertion |
| :--- | :--- | :--- |
| **`real-ai-gateway.test.ts`** | `RealAiGateway` | Mock the HTTP calls to the AI service. Assert the adapter transforms the HTTP JSON strictly into our internal `ITranscript` interface. |

#### C. Service Integration
Because we moved to an Idiomatic Synchronous Pipeline (ADR-007), we test that a service processes data correctly end-to-end.

| Test Suite | Target Service | Setup / Dependency Injection | Act | Assert |
| :--- | :--- | :--- | :--- | :--- |
| **`chunker.integration.test.ts`** | `ChunkerService` | Inject an `InMemoryStorageAdapter`. | Call `chunker.processVideo(...)`. | Assert `MockStorage.download()` was called and chunking completed successfully. |

#### D. SvelteKit BFF Endpoints (Framework Native DI)
**Architectural Rule:** Do not spin up a local server to test endpoints. Pass a mocked SvelteKit `RequestEvent`.

| Test Suite | Target Endpoint | Setup / Dependency Injection | Assert |
| :--- | :--- | :--- | :--- |
| **`progress.test.ts`** | `GET /api/videos/[id]/progress` | Construct a mock request. **Crucial:** Inject `FakeVideoRepository` into `event.locals` (ADR-005). | Assert it returns HTTP 200 with the exact JSON payload matching `IProgressResponse`. |

---

### 3. Level 3: End-to-End (E2E) Tests (The User Journeys)
**Goal:** Validate the entire system wired together (Browser ➔ Kong ➔ SvelteKit ➔ Postgres ➔ FastAPI). 
**Architectural Rule:** Run via Playwright. Configure the E2E environment to use the real database, but your tests must intercept and mock the AI service HTTP calls. This bypasses 3-minute LLM processing times, allowing E2E tests to complete the pipeline loop instantly and deterministically.

#### Journey 1: The Content Creator (Upload & Process)
*   **Target:** `tests/e2e/creator-upload.spec.ts`
*   **Flow:**
    1. Playwright logs in as an Admin.
    2. Navigates to `/studio/upload`.
    3. Attaches `tests/fixtures/mock_video.mp4` and clicks Upload.
*   **Assertions:** 
    *   Playwright observes the UI redirect to the studio dashboard.
    *   Playwright observes the status badge transition from `Uploading` ➔ `Processing` ➔ `Ready`. *(This implicitly proves the SvelteKit API polling, the Event Bus, and the Python FastAPI successfully communicated with each other).*

#### Journey 2: The Learner (Watch & Interact)
*   **Target:** `tests/e2e/learner-interactive.spec.ts`
*   **Setup:** Seed the test database with a pre-processed video, known subtitles, and vocabulary lemmas.
*   **Flow & Assertions:**
    1. Playwright logs in as a Learner and navigates to `/watch/vid_123`.
    2. Clicks "Play" on the video.
    3. Waits for the subtitle text to appear on screen, then clicks the specific highlighted word *"inconceivable"*.
    4. **Assert:** The HTML `<video>` pauses automatically.
    5. **Assert:** The `GameOverlay` appears.
    6. Playwright clicks "I know this word".
    7. **Assert:** A background HTTP POST to `/api/words/known` is fired (intercepted by Playwright).
    8. **Assert:** The overlay disappears, a success toast appears, and the video resumes playing automatically.

---

### Summary: How these tests prove the Architecture is perfect
1. **If you can't write a Unit Test without mocking the Database:** Your service is violating the architecture by coupling to a concrete Implementation instead of a Repository Interface.
2. **If your E2E tests are slow or flaky:** You forgot to mock the AI service HTTP calls, proving you didn't properly isolate your AI dependencies in the test environment.
3. **If your Designer can't view a Component in Histoire:** Your Svelte component is fetching data directly from the server instead of accepting data via `export let` props, violating UI isolation rules.
